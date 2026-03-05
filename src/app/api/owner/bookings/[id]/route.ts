import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    // Fetch booking by id (without ownerId filter) to get restaurantId
    const booking = await db.serviceBooking.findUnique({
      where: { id },
      select: { restaurantId: true },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // RBAC check - verify user has access to read bookings for this restaurant
    await requireRestaurantAccess(session, booking.restaurantId, "bookings:read");

    const fullBooking = await db.serviceBooking.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: { id: true, name: true, address: true, city: true },
        },
        items: {
          include: {
            serviceItem: {
              select: {
                id: true,
                name: true,
                category: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
              },
            },
            partItem: {
              select: {
                id: true,
                name: true,
                category: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
              },
            },
          },
        },
        paymentProof: true,
        engineerAssignments: {
          include: {
            engineer: { select: { id: true, name: true, phone: true } },
            workLog: true,
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: fullBooking });
  } catch (error) {
    console.error("Get booking error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
