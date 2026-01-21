import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { PartRequestStatus } from "@prisma/client";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * GET /api/admin/part-requests/:id
 * Get a single part request details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const partRequest = await db.partRequest.findUnique({
      where: { id },
      include: {
        partItem: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            inventory: {
              select: {
                currentStock: true,
                lowStockThreshold: true,
              },
            },
          },
        },
        engineer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignment: {
          select: {
            id: true,
            bookingId: true,
            status: true,
            booking: {
              select: {
                id: true,
                status: true,
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!partRequest) {
      return NextResponse.json(
        { ok: false, error: "Part request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: partRequest,
    });
  } catch (error) {
    console.error("Get part request error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/part-requests/:id
 * Update a part request (approve, reject, dispatch)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const { action, adminNote, rejectionReason } = body;

    const partRequest = await db.partRequest.findUnique({
      where: { id },
      include: {
        partItem: {
          select: {
            name: true,
          },
        },
        engineer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!partRequest) {
      return NextResponse.json(
        { ok: false, error: "Part request not found" },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {
      adminId: session.id,
      adminNote: adminNote || null,
    };

    let notificationTitle = "";
    let notificationBody = "";

    switch (action) {
      case "approve":
        if (partRequest.status !== PartRequestStatus.PENDING) {
          return NextResponse.json(
            { ok: false, error: "Only pending requests can be approved" },
            { status: 400 }
          );
        }
        updateData.status = PartRequestStatus.APPROVED;
        updateData.approvedAt = new Date();
        notificationTitle = "Part Request Approved";
        notificationBody = `Your request for ${partRequest.partItem.name} has been approved.`;
        break;

      case "reject":
        if (partRequest.status !== PartRequestStatus.PENDING) {
          return NextResponse.json(
            { ok: false, error: "Only pending requests can be rejected" },
            { status: 400 }
          );
        }
        if (!rejectionReason) {
          return NextResponse.json(
            { ok: false, error: "Rejection reason is required" },
            { status: 400 }
          );
        }
        updateData.status = PartRequestStatus.REJECTED;
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = rejectionReason;
        notificationTitle = "Part Request Rejected";
        notificationBody = `Your request for ${partRequest.partItem.name} was rejected. Reason: ${rejectionReason}`;
        break;

      case "dispatch":
        if (partRequest.status !== PartRequestStatus.APPROVED) {
          return NextResponse.json(
            { ok: false, error: "Only approved requests can be dispatched" },
            { status: 400 }
          );
        }
        updateData.status = PartRequestStatus.DISPATCHED;
        updateData.dispatchedAt = new Date();
        notificationTitle = "Part Dispatched";
        notificationBody = `${partRequest.partItem.name} has been dispatched and is on its way.`;
        break;

      default:
        return NextResponse.json(
          { ok: false, error: "Invalid action. Use: approve, reject, or dispatch" },
          { status: 400 }
        );
    }

    const updatedRequest = await db.partRequest.update({
      where: { id },
      data: updateData,
      include: {
        partItem: {
          select: {
            id: true,
            name: true,
          },
        },
        engineer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Send notification to engineer
    if (notificationTitle && notificationBody) {
      await createNotification({
        userId: partRequest.engineer.id,
        title: notificationTitle,
        message: notificationBody,
        type: NotificationType.SYSTEM,
        linkUrl: `/engineer/part-requests/${id}`,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Part request ${action}d successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Update part request error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
