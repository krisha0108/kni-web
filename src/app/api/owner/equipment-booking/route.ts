import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { generateReferenceNumber } from "@/server/reference-number";
import { z } from "zod";

const equipmentBookingSchema = z.object({
  restaurantId: z.string().min(1),
  equipmentId: z.string().min(1),
  serviceTemplateIds: z.array(z.string()).optional(),
  slotStartDateTime: z.string(),
  problemDescription: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();

    const validation = equipmentBookingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      restaurantId,
      equipmentId,
      serviceTemplateIds,
      slotStartDateTime,
      problemDescription,
    } = validation.data;

    // Check restaurant access
    await requireRestaurantAccess(session, restaurantId, "bookings:create");

    // Verify restaurant is approved
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 400 }
      );
    }

    // Verify equipment belongs to restaurant
    const equipment = await db.equipment.findFirst({
      where: {
        id: equipmentId,
        restaurantId,
        deletedAt: null,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Fetch service templates if provided
    let totalAmount = 0;
    let bookingItems: any[] = [];

    if (serviceTemplateIds && serviceTemplateIds.length > 0) {
      const serviceItems = await db.serviceItem.findMany({
        where: { id: { in: serviceTemplateIds }, isActive: true },
      });

      if (serviceItems.length !== serviceTemplateIds.length) {
        return NextResponse.json(
          { ok: false, error: "Some service items not found or inactive" },
          { status: 400 }
        );
      }

      totalAmount = serviceItems.reduce((sum, item) => {
        return sum + (item.price || 0);
      }, 0);

      bookingItems = serviceItems.map((item) => ({
        itemType: "SERVICE" as const,
        serviceItemId: item.id,
        qty: 1,
        priceSnapshot: item.price || 0,
      }));
    }

    // Create the booking
    const ownerId = await getRestaurantOwnerId(restaurantId);
    const booking = await db.$transaction(async (tx) => {
      const bookingNumber = await generateReferenceNumber(tx, () => tx.serviceBooking.count(), "BK");
      return tx.serviceBooking.create({
        data: {
          bookingNumber,
          ownerId,
          restaurantId,
          equipmentId,
          slotStartDateTime: new Date(slotStartDateTime),
          status: "SLOT_SELECTED",
          totalAmount,
          problemDescription,
          items: bookingItems.length > 0 ? {
            create: bookingItems,
          } : undefined,
        },
        include: {
          restaurant: { select: { id: true, name: true } },
          equipment: { select: { id: true, name: true } },
          items: {
            include: {
              serviceItem: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    return NextResponse.json({ ok: true, data: booking });
  } catch (error) {
    console.error("Equipment booking error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
