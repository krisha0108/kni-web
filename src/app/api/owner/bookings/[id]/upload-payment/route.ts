import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { notifyAdminsNewPaymentUploaded } from "@/server/notifications/service";
import { isValidImageUrl } from "@/lib/validations/url";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const body = await request.json();
    const { screenshotUrl } = body;

    if (!screenshotUrl || !isValidImageUrl(screenshotUrl)) {
      return NextResponse.json(
        { ok: false, error: "A valid screenshot URL is required" },
        { status: 400 }
      );
    }

    // Fetch booking by id (without ownerId filter)
    const booking = await db.serviceBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // RBAC check - verify user has access to update bookings for this restaurant
    await requireRestaurantAccess(session, booking.restaurantId, "bookings:update");

    if (booking.status !== "SLOT_SELECTED") {
      return NextResponse.json(
        { ok: false, error: "Cannot upload payment for this booking status" },
        { status: 400 }
      );
    }

    // Use actual restaurant owner ID for the payment proof record FK
    const actualOwnerId = await getRestaurantOwnerId(booking.restaurantId);

    await db.paymentProof.create({
      data: {
        bookingId: id,
        ownerId: actualOwnerId,
        screenshotUrl,
        status: "UPLOADED",
      },
    });

    await db.serviceBooking.update({
      where: { id },
      data: { status: "PAYMENT_UPLOADED" },
    });

    await notifyAdminsNewPaymentUploaded(id, session.name);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Upload payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
