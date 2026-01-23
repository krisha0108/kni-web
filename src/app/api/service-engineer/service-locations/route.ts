import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * GET /api/service-engineer/service-locations
 * Get service locations (restaurants where engineer has completed jobs)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    // Get unique restaurants from engineer's assignments
    const assignments = await db.engineerAssignment.findMany({
      where: {
        engineerId: session.id,
        status: {
          in: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"],
        },
      },
      include: {
        booking: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                pincode: true,
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    // Get unique restaurants
    const restaurantMap = new Map();

    for (const assignment of assignments) {
      const restaurant = assignment.booking.restaurant;
      if (restaurant && !restaurantMap.has(restaurant.id)) {
        restaurantMap.set(restaurant.id, {
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          pincode: restaurant.pincode,
          last_service_date: assignment.assignedAt.toISOString(),
        });
      }
    }

    const serviceLocations = Array.from(restaurantMap.values());

    return NextResponse.json({
      ok: true,
      success: true,
      data: serviceLocations,
    });
  } catch (error) {
    console.error("Get service locations error:", error);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
