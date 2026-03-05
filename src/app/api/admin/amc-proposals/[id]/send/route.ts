import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification, notifyRestaurantTeam } from "@/server/notifications/service";
import { NotificationType, RestaurantRole } from "@prisma/client";

/**
 * POST /api/admin/amc-proposals/[id]/send
 * Send proposal to owner
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const proposal = await db.aMCProposal.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            restaurant: { select: { name: true } },
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.status !== "DRAFT" && proposal.status !== "REJECTED") {
      return NextResponse.json({ ok: false, error: "Proposal is already sent" }, { status: 400 });
    }

    // Update proposal and request status
    const [updated] = await db.$transaction([
      db.aMCProposal.update({
        where: { id },
        data: { status: "SENT", sentAt: new Date() },
      }),
      db.aMCRequest.update({
        where: { id: proposal.requestId },
        data: { status: "PROPOSAL_SENT" },
      }),
    ]);

    // Notify owner
    await createNotification({
      userId: proposal.request.ownerId,
      title: "AMC Proposal Ready",
      message: `An AMC proposal is ready for "${proposal.request.restaurant.name}". Please review and accept/reject.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-requests/${proposal.requestId}`,
    });

    // Notify team members (non-blocking)
    notifyRestaurantTeam({
      restaurantId: proposal.request.restaurantId,
      excludeUserIds: [proposal.request.ownerId],
      roles: [RestaurantRole.MANAGER],
      title: "AMC Proposal Ready",
      message: `An AMC proposal is ready for "${proposal.request.restaurant.name}". Please review.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-requests/${proposal.requestId}`,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Send proposal error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
