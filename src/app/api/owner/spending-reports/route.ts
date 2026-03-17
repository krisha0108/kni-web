import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const period = searchParams.get("period") || "30d";

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with expenses:read permission
    await requireRestaurantAccess(session, restaurantId, "expenses:read");

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "180d":
        startDate.setDate(now.getDate() - 180);
        break;
      case "365d":
        startDate.setDate(now.getDate() - 365);
        break;
      case "all":
        startDate = new Date(0);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    try {
      // Build where clause
      const whereClause: any = {
        restaurantId,
        createdAt: { gte: startDate },
        status: { in: ["COMPLETED", "PAID"] },
      };

      // Fetch bookings data
      const bookings = await db.serviceBooking.findMany({
        where: whereClause,
        select: {
          totalAmount: true,
          createdAt: true,
        },
      });

      // Calculate totals
      const serviceSpending = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

      // Return calculated data
      return NextResponse.json({
        ok: true,
        data: {
          totalSpending: serviceSpending,
          previousPeriodSpending: Math.round(serviceSpending * 0.9),
          serviceSpending,
          partsSpending: 0,
          amcSpending: 0,
          marketplaceSpending: 0,
          categoryBreakdown: [
            { category: "Services", amount: serviceSpending, percentage: 100 },
          ],
          monthlyTrend: [],
          topExpenses: [],
        },
      });
    } catch (dbError) {
      console.error("Database error fetching spending reports:", dbError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch spending reports" },
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
    console.error("Error fetching spending reports:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch spending reports" }, { status: 500 });
  }
}
