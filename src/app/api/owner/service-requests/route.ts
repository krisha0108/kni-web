import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { generateReferenceNumber } from "@/server/reference-number";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with service:read permission
    await requireRestaurantAccess(session, restaurantId, "service:read");

    try {
      const page = parseInt(searchParams.get("page") || "0");
      const pageSize = parseInt(searchParams.get("pageSize") || "50");
      const where = { restaurantId };

      const [bookings, total] = await Promise.all([
        db.serviceBooking.findMany({
          where,
          orderBy: { createdAt: "desc" },
          ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : { take: pageSize }),
          include: {
            restaurant: { select: { name: true } },
          },
        }),
        db.serviceBooking.count({ where }),
      ]);

      return NextResponse.json({
        ok: true,
        data: page > 0 ? { items: bookings, total, page, pageSize } : bookings,
        total,
      });
    } catch (dbError) {
      console.error("Database error fetching service requests:", dbError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch service requests" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error.message?.includes("Access denied")) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    console.error("Error fetching service requests:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch service requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const body = await request.json();
    const {
      restaurantId,
      equipmentId,
      serviceTemplateId,
      slotStartDateTime,
      slotEndDateTime,
      priority,
      problemDescription,
      additionalNotes,
    } = body;

    if (!restaurantId) {
      return NextResponse.json({ ok: false, error: "Restaurant ID is required" }, { status: 400 });
    }

    if (!slotStartDateTime || !slotEndDateTime) {
      return NextResponse.json({ ok: false, error: "Preferred date and time are required" }, { status: 400 });
    }

    if (!problemDescription) {
      return NextResponse.json({ ok: false, error: "Problem description is required" }, { status: 400 });
    }

    try {
      // Verify restaurant access
      await requireRestaurantAccess(session, restaurantId, "service:create");

      // Get the actual restaurant owner ID for the FK
      const ownerId = await getRestaurantOwnerId(restaurantId);

      // Get estimated price from service template if provided
      let estimatedPrice = 0;
      if (serviceTemplateId) {
        const service = await db.serviceItem.findUnique({
          where: { id: serviceTemplateId },
          select: { price: true },
        });
        estimatedPrice = service?.price || 0;
      }

      // Create the booking/service request
      const booking = await db.$transaction(async (tx) => {
        const bookingNumber = await generateReferenceNumber(tx, () => tx.serviceBooking.count(), "BK");
        return tx.serviceBooking.create({
          data: {
            bookingNumber,
            ownerId,
            restaurantId,
            equipmentId: equipmentId || null,
            slotStartDateTime: new Date(slotStartDateTime),
            slotEndDateTime: new Date(slotEndDateTime),
            problemDescription,
            status: "DRAFT",
            totalAmount: estimatedPrice,
          },
        });
      });

      return NextResponse.json({
        ok: true,
        data: booking,
        message: "Service request created successfully",
      });
    } catch (dbError: any) {
      console.error("Database error creating service request:", dbError);
      return NextResponse.json(
        { ok: false, error: "Failed to create service request" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating service request:", error);
    return NextResponse.json({ ok: false, error: "Failed to create service request" }, { status: 500 });
  }
}
