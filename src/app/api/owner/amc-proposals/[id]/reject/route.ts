import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/owner/amc-proposals/[id]/reject
 * Owner rejects the proposal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    const proposal = await db.aMCProposal.findUnique({
      where: { id },
      include: {
        request: {
          include: { restaurant: { select: { id: true, name: true } } },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
    }

    // RBAC: verify user has amc:update access for this restaurant
    await requireRestaurantAccess(session, proposal.request.restaurantId, "amc:update");

    if (proposal.status !== "SENT") {
      return NextResponse.json({ ok: false, error: "Proposal cannot be rejected in current state" }, { status: 400 });
    }

    const [updated] = await db.$transaction([
      db.aMCProposal.update({
        where: { id },
        data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: reason || null },
      }),
      db.aMCRequest.update({
        where: { id: proposal.requestId },
        data: { status: "PROPOSAL_REJECTED" },
      }),
    ]);

    // Notify admins
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "AMC Proposal Rejected",
        message: `Owner rejected the AMC proposal for "${proposal.request.restaurant.name}".${reason ? ` Reason: ${reason}` : ""}`,
        type: NotificationType.AMC,
        linkUrl: `/admin/amc-requests`,
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Reject proposal error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Unauthorized")) ? 401 : 500 }
    );
  }
}
