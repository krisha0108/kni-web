import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { notifyAdminsRestaurantDeletionRequest } from "@/server/notifications/service";
import { deletionReasonSchema } from "@/lib/validations/rejection";
import { z } from "zod";

const requestSchema = z.object({
  reason: deletionReasonSchema,
});

// POST - Owner requests deletion of an APPROVED restaurant (requires admin approval)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    await requireRestaurantAccess(session, id, "restaurant:delete");

    const restaurant = await db.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      return NextResponse.json({ ok: false, error: "Restaurant not found" }, { status: 404 });
    }

    if (restaurant.status !== "APPROVED") {
      return NextResponse.json(
        {
          ok: false,
          error: "Only approved restaurants require a deletion request. Use the direct delete action instead.",
        },
        { status: 400 }
      );
    }

    const existingPending = await db.restaurantDeletionRequest.findFirst({
      where: { restaurantId: id, status: "PENDING" },
    });
    if (existingPending) {
      return NextResponse.json(
        { ok: false, error: "A deletion request for this restaurant is already pending admin review." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const deletionRequest = await db.restaurantDeletionRequest.create({
      data: {
        restaurantId: id,
        restaurantName: restaurant.name,
        ownerId: restaurant.ownerId,
        reason: validation.data.reason,
      },
    });

    await notifyAdminsRestaurantDeletionRequest(restaurant.name, session.name);

    return NextResponse.json({ ok: true, data: deletionRequest });
  } catch (error) {
    console.error("Create deletion request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : error instanceof Error && error.message.includes("not found") ? 404 : 500 }
    );
  }
}

// DELETE - Owner cancels their own still-pending deletion request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    await requireRestaurantAccess(session, id, "restaurant:delete");

    const pending = await db.restaurantDeletionRequest.findFirst({
      where: { restaurantId: id, status: "PENDING" },
    });
    if (!pending) {
      return NextResponse.json(
        { ok: false, error: "No pending deletion request found for this restaurant." },
        { status: 404 }
      );
    }

    await db.restaurantDeletionRequest.delete({ where: { id: pending.id } });

    return NextResponse.json({ ok: true, message: "Deletion request cancelled" });
  } catch (error) {
    console.error("Cancel deletion request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : error instanceof Error && error.message.includes("not found") ? 404 : 500 }
    );
  }
}
