import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const period = request.nextUrl.searchParams.get("period") || "30"; // days

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access
    await requireRestaurantAccess(session, restaurantId, "bookings:read");

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Parallel queries for better performance
    const [
      bookingStats,
      expenseStats,
      equipmentCount,
      amcStats,
      marketplaceOrderStats,
      recentBookings,
      recentExpenses,
    ] = await Promise.all([
      // Booking statistics
      db.serviceBooking.aggregate({
        where: {
          restaurantId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),

      // Expense statistics
      db.expense.aggregate({
        where: {
          restaurantId,
          expenseDate: { gte: startDate },
        },
        _count: { id: true },
        _sum: { amount: true },
      }),

      // Equipment count
      db.equipment.count({
        where: {
          restaurantId,
          status: "AVAILABLE",
        },
      }),

      // AMC subscription statistics
      db.aMCSubscription.aggregate({
        where: {
          restaurantId,
          status: "ACTIVE",
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),

      // Marketplace order statistics
      db.marketplaceOrder.aggregate({
        where: {
          restaurantId,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),

      // Recent bookings (last 5)
      db.serviceBooking.findMany({
        where: { restaurantId },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          slotStartDateTime: true,
        },
      }),

      // Recent expenses (last 5)
      db.expense.findMany({
        where: { restaurantId },
        take: 5,
        orderBy: { expenseDate: "desc" },
        select: {
          id: true,
          amount: true,
          category: true,
          expenseDate: true,
          description: true,
        },
      }),
    ]);

    // Booking status breakdown
    const bookingsByStatus = await db.serviceBooking.groupBy({
      by: ["status"],
      where: {
        restaurantId,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    // Expense by category
    const expensesByCategory = await db.expense.groupBy({
      by: ["category"],
      where: {
        restaurantId,
        expenseDate: { gte: startDate },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Marketplace order status breakdown
    const marketplaceOrdersByStatus = await db.marketplaceOrder.groupBy({
      by: ["status"],
      where: {
        restaurantId,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    // Daily booking trend (last 7 days)
    const dailyBookingTrendRaw = await db.$queryRaw<
      Array<{ date: Date; count: bigint; revenue: number }>
    >`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) as count,
        SUM(totalAmount) as revenue
      FROM ServiceBooking
      WHERE restaurantId = ${restaurantId}
        AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `;

    // Convert BigInt to Number
    const dailyBookingTrend = dailyBookingTrendRaw.map(item => ({
      date: item.date,
      count: Number(item.count),
      revenue: item.revenue,
    }));

    // Daily expense trend (last 7 days)
    const dailyExpenseTrendRaw = await db.$queryRaw<
      Array<{ date: Date; count: bigint; total: number }>
    >`
      SELECT
        DATE(expenseDate) as date,
        COUNT(*) as count,
        SUM(amount) as total
      FROM Expense
      WHERE restaurantId = ${restaurantId}
        AND expenseDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(expenseDate)
      ORDER BY date DESC
    `;

    // Convert BigInt to Number
    const dailyExpenseTrend = dailyExpenseTrendRaw.map(item => ({
      date: item.date,
      count: Number(item.count),
      total: item.total,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          bookings: {
            count: Number(bookingStats._count.id),
            revenue: bookingStats._sum.totalAmount || 0,
          },
          expenses: {
            count: Number(expenseStats._count.id),
            total: expenseStats._sum.amount || 0,
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
          netRevenue:
            (bookingStats._sum.totalAmount || 0) -
            (expenseStats._sum.amount || 0),
        },
        breakdowns: {
          bookingsByStatus: bookingsByStatus.map((item) => ({
            status: item.status,
            count: Number(item._count.id),
          })),
          expensesByCategory: expensesByCategory.map((item) => ({
            category: item.category,
            count: Number(item._count.id),
            total: item._sum.amount || 0,
          })),
          marketplaceOrdersByStatus: marketplaceOrdersByStatus.map((item) => ({
            status: item.status,
            count: Number(item._count.id),
          })),
        },
        trends: {
          dailyBookings: dailyBookingTrend,
          dailyExpenses: dailyExpenseTrend,
        },
        recent: {
          bookings: recentBookings,
          expenses: recentExpenses,
        },
      },
    });
  } catch (error) {
    console.error("Owner analytics error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
