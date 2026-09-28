import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { generateReferenceNumber } from "@/server/reference-number";

/**
 * POST /api/app/equipment-requests
 * Create equipment service request from mobile app
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      product_id,
      product_name,
      description,
      service_type,
      restaurant_id,
      restaurant_name,
      location,
      service_date,
      owner_equipment_id,
      urgency,
      tags,
      total_amount,
      items,
    } = body;

    // Validate required fields
    if (!restaurant_id) {
      return NextResponse.json(
        { ok: false, error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    // Parse service_date if provided
    let slotStart: Date | undefined;
    if (service_date) {
      slotStart = new Date(service_date);
      if (isNaN(slotStart.getTime())) {
        slotStart = undefined;
      }
    }

    // Create service booking
    // Set status to SLOT_SELECTED if a date is provided (allows payment upload)
    const bookingStatus = slotStart ? "SLOT_SELECTED" : "DRAFT";

    // Parse total amount (stored as integer)
    const parsedTotalAmount = total_amount ? Math.round(Number(total_amount)) : 0;

    // Prepare booking items if provided
    const bookingItems = Array.isArray(items) ? items.map((item: any) => ({
      itemType: item.item_type === 'part' || item.item_type === 'PART' ? 'PART' as const : 'SERVICE' as const,
      serviceItemId: item.item_type === 'service' || item.item_type === 'SERVICE' ? item.item_id : null,
      partItemId: item.item_type === 'part' || item.item_type === 'PART' ? item.item_id : null,
      qty: Number(item.qty) || 1,
      priceSnapshot: Math.round(Number(item.price || item.unitPrice || 0)),
    })) : [];

    const booking = await db.$transaction(async (tx) => {
      const bookingNumber = await generateReferenceNumber(tx, () => tx.serviceBooking.count(), "BK");
      return tx.serviceBooking.create({
        data: {
          bookingNumber,
          ownerId: session.id,
          restaurantId: restaurant_id,
          equipmentId: owner_equipment_id || undefined,
          status: bookingStatus,
          totalAmount: parsedTotalAmount,
          slotStartDateTime: slotStart,
          problemDescription: description || '',
          items: bookingItems.length > 0 ? {
            create: bookingItems,
          } : undefined,
        },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          items: true,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: booking.id,
        booking_id: booking.id,
        booking_number: booking.bookingNumber,
        status: booking.status,
        restaurant: {
          id: booking.restaurant.id,
          name: booking.restaurant.name,
          address: booking.restaurant.address,
        },
        scheduled_date: booking.slotStartDateTime?.toISOString(),
        created_at: booking.createdAt.toISOString(),
      },
      message: "Service request created successfully",
    });
  } catch (error: any) {
    console.error("Create equipment request error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to create equipment request",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/app/equipment-requests
 * Fetch equipment requests for current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const where: any = {
      ownerId: session.id,
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    const bookings = await db.serviceBooking.findMany({
      where,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        engineerAssignments: {
          where: {
            status: 'ACCEPTED',
          },
          include: {
            engineer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formatted = bookings.map((b) => {
      const assignment = b.engineerAssignments[0];
      return {
        id: b.id,
        booking_id: b.id,
        status: b.status,
        total_amount: b.totalAmount,
        problem_description: b.problemDescription,
        restaurant: {
          id: b.restaurant.id,
          name: b.restaurant.name,
          address: b.restaurant.address,
        },
        engineer: assignment ? {
          id: assignment.engineer.id,
          name: assignment.engineer.name,
          phone: assignment.engineer.phone,
        } : null,
        scheduled_date: b.slotStartDateTime?.toISOString(),
        created_at: b.createdAt.toISOString(),
        updated_at: b.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      ok: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Get equipment requests error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to fetch equipment requests",
      },
      { status: 500 }
    );
  }
}
