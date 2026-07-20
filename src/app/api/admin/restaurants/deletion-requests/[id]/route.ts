import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import {
  notifyOwnerRestaurantDeletionApproved,
  notifyOwnerRestaurantDeletionRejected,
} from "@/server/notifications/service";
import { assertRestaurantDeletable, RestaurantNotDeletableError } from "@/server/restaurants/deletion";
import { rejectionReasonSchema } from "@/lib/validations/rejection";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const deletionRequest = await db.restaurantDeletionRequest.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        restaurant: true,
      },
    });

    if (!deletionRequest) {
      return NextResponse.json({ ok: false, error: "Deletion request not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: deletionRequest });
  } catch (error) {
    console.error("Get deletion request error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = actionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { action, reason } = validation.data;

    const deletionRequest = await db.restaurantDeletionRequest.findUnique({
      where: { id },
    });

    if (!deletionRequest) {
      return NextResponse.json({ ok: false, error: "Deletion request not found" }, { status: 404 });
    }

    if (deletionRequest.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: "This deletion request has already been resolved" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      if (!deletionRequest.restaurantId) {
        return NextResponse.json(
          { ok: false, error: "Restaurant no longer exists" },
          { status: 400 }
        );
      }

      try {
        await assertRestaurantDeletable(deletionRequest.restaurantId);
      } catch (err) {
        if (err instanceof RestaurantNotDeletableError) {
          return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
        }
        throw err;
      }

      await db.restaurant.delete({ where: { id: deletionRequest.restaurantId } });

      await db.restaurantDeletionRequest.update({
        where: { id },
        data: { status: "APPROVED", resolvedAt: new Date(), resolvedBy: session.id },
      });

      await notifyOwnerRestaurantDeletionApproved(deletionRequest.ownerId, deletionRequest.restaurantName);
    } else {
      const reasonValidation = rejectionReasonSchema.safeParse(reason);
      if (!reasonValidation.success) {
        return NextResponse.json(
          { ok: false, error: reasonValidation.error.issues[0]?.message || "Invalid rejection reason" },
          { status: 400 }
        );
      }

      await db.restaurantDeletionRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: reasonValidation.data,
          resolvedAt: new Date(),
          resolvedBy: session.id,
        },
      });

      await notifyOwnerRestaurantDeletionRejected(
        deletionRequest.ownerId,
        deletionRequest.restaurantName,
        reasonValidation.data
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Resolve deletion request error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
