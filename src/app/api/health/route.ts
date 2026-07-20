import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/health
 * Health check endpoint - verify backend is working
 */
export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const userCount = await db.user.count();
    const restaurantCount = await db.restaurant.count();
    const feedCount = await db.feed.count();
    const guideCount = await db.guide.count();
    const sponsoredCount = await db.sponsoredContent.count();

    return NextResponse.json({
      ok: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        counts: {
          users: userCount,
          restaurants: restaurantCount,
          feeds: feedCount,
          guides: guideCount,
          sponsored: sponsoredCount,
        },
      },
      endpoints: {
        public: [
          "GET /api/app_api/feeds",
          "GET /api/app_api/guides",
          "GET /api/app_api/sponsored",
          "GET /api/app/products",
          "GET /api/app/services",
          "GET /api/app/parts",
          "GET /api/app/restaurantlist",
          "POST /api/app/equipment-requests",
          "POST /api/restaurant/login",
          "POST /api/restaurant/register",
        ],
        authenticated: [
          "GET /api/restaurants/profile",
          "GET /api/app_api/owner/profile",
          "PUT /api/app_api/owner/profile",
          "GET /api/app_api/owner/orders",
          "GET /api/support/tickets",
          "POST /api/support/tickets",
        ],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        error: error.message,
        database: {
          connected: false,
        },
      },
      { status: 500 }
    );
  }
}
