import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { renderToStream } from "@react-pdf/renderer";
import { OwnerAnalyticsDocument } from "@/lib/pdf/owner-analytics-document";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const period = request.nextUrl.searchParams.get("period") || "30";

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access
    await requireRestaurantAccess(session, restaurantId, "bookings:read");

    // Get restaurant name
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch analytics data (same as analytics route)
    const [
      bookingStats,
      expenseStats,
      equipmentCount,
      amcStats,
      marketplaceOrderStats,
      recentBookings,
      recentExpenses,
    ] = await Promise.all([
      db.serviceBooking.aggregate({
        where: { restaurantId, createdAt: { gte: startDate } },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      db.expense.aggregate({
        where: { restaurantId, expenseDate: { gte: startDate } },
        _count: { id: true },
        _sum: { amount: true },
      }),
      db.equipment.count({
        where: { restaurantId },
      }),
      db.aMCSubscription.aggregate({
        where: { restaurantId },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      db.marketplaceOrder.aggregate({
        where: { restaurantId, createdAt: { gte: startDate } },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      db.serviceBooking.findMany({
        where: { restaurantId, createdAt: { gte: startDate } },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.expense.findMany({
        where: { restaurantId, expenseDate: { gte: startDate } },
        select: {
          id: true,
          amount: true,
          category: true,
          expenseDate: true,
          description: true,
        },
        orderBy: { expenseDate: "desc" },
        take: 5,
      }),
    ]);

    const bookingsByStatus = await db.serviceBooking.groupBy({
      by: ["status"],
      where: { restaurantId, createdAt: { gte: startDate } },
      _count: { id: true },
    });

    const expensesByCategory = await db.expense.groupBy({
      by: ["category"],
      where: { restaurantId, expenseDate: { gte: startDate } },
      _count: { id: true },
      _sum: { amount: true },
    });

    const marketplaceOrdersByStatus = await db.marketplaceOrder.groupBy({
      by: ["status"],
      where: { restaurantId, createdAt: { gte: startDate } },
      _count: { id: true },
    });

    // Calculate net revenue
    const bookingRevenue = bookingStats._sum.totalAmount || 0;
    const expensesTotal = expenseStats._sum?.amount || 0;
    const netRevenue = bookingRevenue - expensesTotal;

    const analyticsData = {
      restaurantName: restaurant.name,
      period: `Last ${periodDays} days`,
      generatedAt: new Date().toISOString(),
      summary: {
        bookings: {
          count: Number(bookingStats._count.id),
          revenue: bookingRevenue,
        },
        expenses: {
          count: Number(expenseStats._count?.id || 0),
          total: expensesTotal,
        },
        equipment: {
          count: equipmentCount,
        },
        amcSubscriptions: {
          count: Number(amcStats._count.id),
          value: amcStats._sum.totalAmount || 0,
        },
        marketplaceOrders: {
          count: Number(marketplaceOrderStats._count.id),
          total: marketplaceOrderStats._sum.totalAmount || 0,
        },
        netRevenue,
      },
      breakdowns: {
        bookingsByStatus: bookingsByStatus.map((item) => ({
          status: item.status,
          count: Number(item._count?.id || 0),
        })),
        expensesByCategory: expensesByCategory.map((item) => ({
          category: item.category,
          count: Number(item._count?.id || 0),
          total: item._sum?.amount || 0,
        })),
        marketplaceOrdersByStatus: marketplaceOrdersByStatus.map((item) => ({
          status: item.status,
          count: Number(item._count?.id || 0),
        })),
      },
      recent: {
        bookings: recentBookings.map((b) => ({
          id: b.id,
          status: b.status,
          totalAmount: b.totalAmount,
          createdAt: b.createdAt.toISOString(),
        })),
        expenses: recentExpenses.map((e) => ({
          id: e.id,
          amount: e.amount,
          category: e.category,
          date: e.expenseDate.toISOString(),
          description: e.description,
        })),
      },
    };

    // Generate PDF
    const stream = await renderToStream(
      OwnerAnalyticsDocument({ data: analyticsData })
    );

    // Create filename
    const filename = `analytics-${restaurant.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

    // Return PDF as download
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export analytics error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
