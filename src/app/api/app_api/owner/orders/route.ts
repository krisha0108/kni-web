import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getMobileSession } from "@/server/auth/mobile-session";

/**
 * GET /api/app_api/owner/orders
 * Fetch owner's service bookings/orders
 * Filter by status: active | completed
 * Supports both cookie-based (web) and token-based (mobile) authentication
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";

    const where: any = {
      ownerId: session.id, // Fixed: use session.id instead of session.userId
    };

    // Filter by status
    if (status === "active") {
      where.status = {
        notIn: ["COMPLETED", "CANCELLED"],
      };
    } else if (status === "completed") {
      where.status = {
        in: ["COMPLETED", "CANCELLED"],
      };
    }

    const orders = await db.serviceBooking.findMany({
      where,
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        totalAmount: true,
        slotStartDateTime: true,
        createdAt: true,
        updatedAt: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        engineerAssignments: {
          select: {
            id: true,
            status: true,
            engineer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
          where: {
            status: {
              in: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"],
            },
          },
          take: 1,
        },
        items: {
          select: {
            id: true,
            serviceItem: {
              select: {
                name: true,
                price: true,
              },
            },
            partItem: {
              select: {
                name: true,
                price: true,
              },
            },
            qty: true,
            priceSnapshot: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format for mobile app
    const formatted = orders.map((order) => {
      const assignment = order.engineerAssignments[0];
      return {
        id: order.id,
        order_id: order.bookingNumber ?? `ORD-${order.id.slice(0, 8).toUpperCase()}`,
        status: order.status,
        tracking_status: order.status.toLowerCase().replace("_", " "),
        total_amount: order.totalAmount,
        restaurant_id: order.restaurant.id,
        restaurant_name: order.restaurant.name,
        location: order.restaurant.address,
        product_name: order.items[0]?.serviceItem?.name || order.items[0]?.partItem?.name || "Service Request",
        service_date: order.slotStartDateTime?.toISOString(),
        created_at: order.createdAt.toISOString(),
        updated_at: order.updatedAt.toISOString(),
        engineer: assignment?.engineer
          ? {
              id: assignment.engineer.id,
              name: assignment.engineer.name,
              phone: assignment.engineer.phone,
            }
          : null,
        image: null, // TODO: Add service/equipment image if needed
      };
    });

    return NextResponse.json({
      success: true,
      ok: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Get owner orders error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
