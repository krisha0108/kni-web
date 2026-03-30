/**
 * ============================================================================
 * ADMIN PART REQUEST ACTIONS API
 * ============================================================================
 *
 * ADMIN ACTIONS ON PART REQUESTS:
 * -------------------------------
 * This API handles admin actions (approve, reject, dispatch) on individual
 * part requests. Each action triggers notifications to the engineer.
 *
 * AVAILABLE ACTIONS:
 *
 * 1. APPROVE (PENDING → APPROVED)
 *    ─────────────────────────────
 *    - Admin approves the part request
 *    - Optional: Add admin note
 *    - Records approvedAt timestamp and adminId
 *    - Engineer notified: "Your request for {part} has been approved"
 *    - Request moves to "Ready to Dispatch" queue
 *
 * 2. REJECT (PENDING → REJECTED)
 *    ────────────────────────────
 *    - Admin rejects the part request
 *    - Required: Rejection reason (displayed to engineer)
 *    - Optional: Admin note
 *    - Records rejectedAt timestamp and adminId
 *    - Engineer notified: "Your request for {part} was rejected. Reason: {reason}"
 *    - Request is terminal (cannot be recovered)
 *
 * 3. DISPATCH (APPROVED → DISPATCHED)
 *    ─────────────────────────────────
 *    - Admin marks part as shipped/dispatched
 *    - Records dispatchedAt timestamp
 *    - Engineer notified: "{part} has been dispatched and is on its way"
 *    - Engineer can now use "Confirm Delivery" button
 *
 * STATUS FLOW:
 *
 *   PENDING ──┬──► APPROVED ──► DISPATCHED ──► DELIVERED (by engineer)
 *             │
 *             ├──► REJECTED (terminal)
 *             │
 *             └──► CANCELLED (by engineer, terminal)
 *
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { PartRequestStatus, NotificationType } from "@prisma/client";
import { createNotification, checkAndNotifyLowStock } from "@/server/notifications/service";

/**
 * GET /api/admin/part-requests/:id
 *
 * Fetch single part request with full details including:
 * - Part info (name, description, price, category, current stock)
 * - Engineer info (name, email, phone)
 * - Assignment info (job, restaurant address)
 * - Processing admin info (who approved/rejected)
 *
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
 *
 * Process admin actions on a part request.
 *
 * Request Body:
 * - action (required): "approve" | "reject" | "dispatch"
 * - adminNote (optional): Note from admin (visible to engineer)
 * - rejectionReason (required for reject): Reason for rejection
 *
 * Action Validations:
 * - approve: Only PENDING requests can be approved
 * - reject: Only PENDING requests can be rejected, reason required
 * - dispatch: Only APPROVED requests can be dispatched
 *
 * Side Effects:
 * - Updates request status and timestamp
 * - Records adminId who processed the request
 * - Creates notification for engineer
 *
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

    // Use transaction for dispatch (needs stock deduction) or simple update for others
    let updatedRequest;

    if (action === "dispatch") {
      updatedRequest = await db.$transaction(async (tx) => {
        const updated = await tx.partRequest.update({
          where: { id },
          data: updateData,
          include: {
            partItem: { select: { id: true, name: true } },
            engineer: { select: { id: true, name: true } },
          },
        });

        // Deduct stock from warehouse on dispatch
        const inv = await tx.warehouseInventory.findUnique({
          where: { partItemId: updated.partItem.id },
        });

        if (inv) {
          const newBalance = Math.max(0, inv.currentStock - partRequest.quantity);
          await tx.stockMovement.create({
            data: {
              inventoryId: inv.id,
              movementType: "OUTWARD_USAGE",
              quantity: partRequest.quantity,
              balanceAfter: newBalance,
              notes: `Dispatched for part request #${id} to ${partRequest.engineer.name}`,
              createdBy: session.id,
            },
          });
          await tx.warehouseInventory.update({
            where: { id: inv.id },
            data: { currentStock: newBalance },
          });

          // Check and notify if stock is low
          checkAndNotifyLowStock(updated.partItem.name, newBalance, inv.lowStockThreshold).catch(console.error);
        }

        return updated;
      });
    } else {
      updatedRequest = await db.partRequest.update({
        where: { id },
        data: updateData,
        include: {
          partItem: { select: { id: true, name: true } },
          engineer: { select: { id: true, name: true } },
        },
      });
    }

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
