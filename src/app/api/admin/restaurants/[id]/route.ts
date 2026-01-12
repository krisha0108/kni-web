import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import {
  notifyOwnerRestaurantApproved,
  notifyOwnerRestaurantRejected,
} from "@/server/notifications/service";
import { z } from "zod";

const approveSchema = z.object({
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

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        categories: { include: { category: true } },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: restaurant });
  } catch (error) {
    console.error("Get restaurant error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = approveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { action, reason } = validation.data;

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      await db.restaurant.update({
        where: { id },
        data: { status: "APPROVED" },
      });
      await notifyOwnerRestaurantApproved(restaurant.ownerId, restaurant.name);
    } else {
      if (!reason) {
        return NextResponse.json(
          { ok: false, error: "Rejection reason is required" },
          { status: 400 }
        );
      }
      await db.restaurant.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason: reason },
      });
      await notifyOwnerRestaurantRejected(restaurant.ownerId, restaurant.name, reason);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Approve/reject restaurant error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
