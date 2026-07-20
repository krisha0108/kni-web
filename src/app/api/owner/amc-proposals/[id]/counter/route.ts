import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";
import { z } from "zod";

const counterSchema = z.object({
  counterPrice: z.number().int().positive(),
  message: z.string().max(500).optional(),
});

/**
 * PATCH /api/owner/amc-proposals/[id]/counter
 * Owner counters admin's proposed price with their own proposed price.
 * Only allowed while the proposal is SENT.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const body = await request.json();
    const validation = counterSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { counterPrice, message } = validation.data;

    const proposal = await db.aMCProposal.findUnique({
      where: { id },
      include: {
        request: { include: { restaurant: { select: { id: true, name: true } } } },
      },
    });

    if (!proposal) {
      return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
    }

    await requireRestaurantAccess(session, proposal.request.restaurantId, "amc:update");

    if (proposal.status !== "SENT") {
      return NextResponse.json(
        { ok: false, error: "You can only counter a proposal that's awaiting your response" },
        { status: 400 }
      );
    }

    const updated = await db.aMCProposal.update({
      where: { id },
      data: {
        status: "COUNTERED",
        ownerCounterPrice: counterPrice,
        ownerCounterMessage: message || null,
      },
    });

    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const admin of admins) {
      createNotification({
        userId: admin.id,
        title: "AMC Price Counter-Offer",
        message: `Owner countered with ₹${counterPrice.toLocaleString("en-IN")} for "${proposal.request.restaurant.name}"'s AMC proposal.`,
        type: NotificationType.AMC,
        linkUrl: `/admin/amc-requests`,
      }).catch(console.error);
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Counter AMC proposal error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
