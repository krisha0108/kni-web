import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * GET /api/admin/amc-requests/[id]
 * Get specific AMC request detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const amcRequest = await db.aMCRequest.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        restaurant: { select: { id: true, name: true, city: true, address: true } },
      },
    });

    if (!amcRequest) {
      return NextResponse.json(
        { ok: false, error: "AMC request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: amcRequest });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * PATCH /api/admin/amc-requests/[id]
 * Update AMC request status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const amcRequest = await db.aMCRequest.findUnique({
      where: { id },
      include: {
        restaurant: { select: { name: true } },
      },
    });

    if (!amcRequest) {
      return NextResponse.json(
        { ok: false, error: "AMC request not found" },
        { status: 404 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      REQUESTED: ["SURVEY_SCHEDULED", "CANCELLED"],
      SURVEY_SCHEDULED: ["SURVEY_COMPLETED", "CANCELLED"],
      SURVEY_COMPLETED: ["PROPOSAL_SENT", "CANCELLED"],
      PROPOSAL_SENT: ["PROPOSAL_ACCEPTED", "PROPOSAL_REJECTED"],
      PROPOSAL_REJECTED: ["PROPOSAL_SENT", "CANCELLED"],
    };

    const allowedStatuses = validTransitions[amcRequest.status] || [];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: `Cannot change status from ${amcRequest.status} to ${status}` },
        { status: 400 }
      );
    }

    const updated = await db.aMCRequest.update({
      where: { id },
      data: { status },
    });

    // Send notification to owner based on status change
    // NOTE: PROPOSAL_SENT notification is handled in /api/admin/amc-proposals/[id]/send
    const notificationMessages: Record<string, { title: string; message: string }> = {
      SURVEY_SCHEDULED: {
        title: "AMC Survey Scheduled",
        message: `A site survey has been scheduled for your AMC request at "${amcRequest.restaurant.name}".`,
      },
      CANCELLED: {
        title: "AMC Request Cancelled",
        message: `Your AMC request for "${amcRequest.restaurant.name}" has been cancelled.`,
      },
    };

    const notif = notificationMessages[status];
    if (notif) {
      await createNotification({
        userId: amcRequest.ownerId,
        title: notif.title,
        message: notif.message,
        type: NotificationType.AMC,
        linkUrl: `/owner/amc-requests`,
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Update AMC request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
