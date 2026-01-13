import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { z } from "zod";
import { sendBookingConfirmationEmail } from "@/lib/email";

const createBookingSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  slotStartDateTime: z.string(),
  slotEndDateTime: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with bookings:read permission
    await requireRestaurantAccess(session, restaurantId, "bookings:read");

    const bookings = await db.serviceBooking.findMany({
      where: { restaurantId },
      include: {
        restaurant: { select: { id: true, name: true } },
        items: {
          include: {
            serviceItem: { select: { id: true, name: true } },
            partItem: { select: { id: true, name: true } },
          },
        },
        paymentProof: true,
        engineerAssignments: {
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
    const session = await requireOwner();

    const body = await request.json();
    const validation = createBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, slotStartDateTime, slotEndDateTime } = validation.data;

    // Check restaurant access with bookings:create permission
    await requireRestaurantAccess(session, restaurantId, "bookings:create");

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 400 }
      );
    }

    const cart = await db.cart.findFirst({
      where: { ownerId: session.id, restaurantId, status: "DRAFT" },
      include: {
        items: {
          include: {
            serviceItem: { select: { name: true } },
            partItem: { select: { name: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Cart is empty" },
        { status: 400 }
      );
    }

    const totalAmount = cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.qty, 0);

    // Delete any existing ARCHIVED carts to avoid unique constraint violation
    await db.cart.deleteMany({
      where: {
        ownerId: session.id,
        restaurantId,
        status: "ARCHIVED",
      },
    });

    // Archive any existing SUBMITTED carts to avoid unique constraint violation
    await db.cart.updateMany({
      where: {
        ownerId: session.id,
        restaurantId,
        status: "SUBMITTED",
      },
      data: { status: "ARCHIVED" },
    });

    const booking = await db.serviceBooking.create({
      data: {
        ownerId: session.id,
        restaurantId,
        slotStartDateTime: new Date(slotStartDateTime),
        slotEndDateTime: slotEndDateTime
          ? new Date(slotEndDateTime)
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

    // Send booking confirmation email (non-blocking)
    const items = cart.items.map((item) => ({
      name: item.serviceItem?.name || item.partItem?.name || "Unknown Item",
      quantity: item.qty,
    }));

    sendBookingConfirmationEmail(
      session.email,
      session.name,
      booking.id,
      restaurant.name,
      totalAmount,
      items
    ).catch((error) => {
      console.error("Failed to send booking confirmation email:", error);
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
