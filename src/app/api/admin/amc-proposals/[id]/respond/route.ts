import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification, notifyRestaurantTeam } from "@/server/notifications/service";
import { NotificationType, RestaurantRole } from "@prisma/client";
import { z } from "zod";

const respondSchema = z.object({
  price: z.number().int().positive(),
  adminNote: z.string().max(500).optional(),
});

/**
 * PATCH /api/admin/amc-proposals/[id]/respond
 * Admin responds to an owner's countered price with a revised proposal
 * (which may match the owner's counter, or be a different price). Sends it
 * straight back to the owner (status -> SENT), same as the initial send.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = respondSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { price, adminNote } = validation.data;

    const proposal = await db.aMCProposal.findUnique({
      where: { id },
      include: {
        request: { include: { restaurant: { select: { name: true } } } },
      },
    });

    if (!proposal) {
      return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.status !== "COUNTERED") {
      return NextResponse.json(
        { ok: false, error: "Only a countered proposal can be revised and re-sent" },
        { status: 400 }
      );
    }

    const [updated] = await db.$transaction([
      db.aMCProposal.update({
        where: { id },
        data: {
          price,
          adminNote: adminNote || null,
          ownerCounterPrice: null,
          ownerCounterMessage: null,
          status: "SENT",
          sentAt: new Date(),
        },
      }),
      db.aMCRequest.update({
        where: { id: proposal.requestId },
        data: { status: "PROPOSAL_SENT" },
      }),
    ]);

    createNotification({
      userId: proposal.request.ownerId,
      title: "Revised AMC Proposal Ready",
      message: `Admin sent a revised price for "${proposal.request.restaurant.name}"'s AMC proposal. Please review.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-requests/${proposal.requestId}`,
    }).catch(console.error);

    notifyRestaurantTeam({
      restaurantId: proposal.request.restaurantId,
      excludeUserIds: [proposal.request.ownerId],
      roles: [RestaurantRole.MANAGER],
      title: "Revised AMC Proposal Ready",
      message: `Admin sent a revised price for "${proposal.request.restaurant.name}"'s AMC proposal.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-requests/${proposal.requestId}`,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Respond to AMC proposal error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
