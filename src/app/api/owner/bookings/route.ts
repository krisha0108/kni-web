import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerWithApprovedRestaurant } from "@/server/auth/rbac";
import { z } from "zod";

const createBookingSchema = z.object({
  slotStartDateTime: z.string(),
  slotEndDateTime: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireOwnerWithApprovedRestaurant();

    const bookings = await db.serviceBooking.findMany({
      where: { ownerId: session.id },
      include: {
        restaurant: { select: { id: true, name: true } },
        items: {
          include: {
            serviceItem: { select: { id: true, name: true } },
            partItem: { select: { id: true, name: true } },
          },
        },
        paymentProof: true,
        engineerAssignment: {
          include: { engineer: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerWithApprovedRestaurant();

    const body = await request.json();
    const validation = createBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const restaurant = await db.restaurant.findFirst({
      where: { ownerId: session.id, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "No approved restaurant" },
        { status: 400 }
      );
    }

    const cart = await db.cart.findFirst({
      where: { ownerId: session.id, restaurantId: restaurant.id, status: "DRAFT" },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Cart is empty" },
        { status: 400 }
      );
    }

    const totalAmount = cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.qty, 0);

    const booking = await db.serviceBooking.create({
      data: {
        ownerId: session.id,
        restaurantId: restaurant.id,
        slotStartDateTime: new Date(validation.data.slotStartDateTime),
        slotEndDateTime: validation.data.slotEndDateTime
          ? new Date(validation.data.slotEndDateTime)
          : null,
        status: "SLOT_SELECTED",
        totalAmount,
        items: {
          create: cart.items.map((item) => ({
            itemType: item.itemType,
            serviceItemId: item.serviceItemId,
            partItemId: item.partItemId,
            qty: item.qty,
            priceSnapshot: item.priceSnapshot,
          })),
        },
      },
    });

    await db.cart.update({
      where: { id: cart.id },
      data: { status: "SUBMITTED" },
    });

    return NextResponse.json({ ok: true, data: booking });
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
