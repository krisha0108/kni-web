import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const period = request.nextUrl.searchParams.get("period") || "30";

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    await requireRestaurantAccess(session, restaurantId, "bookings:read");

    // Calculate date range for the last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // 1. Monthly Revenue Trend (last 6 months)
    const [completedBookings, expenses] = await Promise.all([
      db.serviceBooking.findMany({
        where: {
          restaurantId,
          status: "COMPLETED",
          createdAt: { gte: sixMonthsAgo },
        },
        select: {
          totalAmount: true,
          createdAt: true,
        },
      }),
      db.expense.findMany({
        where: {
          restaurantId,
          deletedAt: null,
          expenseDate: { gte: sixMonthsAgo },
        },
        select: {
          amount: true,
          expenseDate: true,
        },
      }),
    ]);

    // Build monthly trend data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrend: Array<{ month: string; revenue: number; expenses: number; profit: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const monthRevenue = completedBookings
        .filter((b) => b.createdAt >= monthStart && b.createdAt < monthEnd)
        .reduce((sum, b) => sum + b.totalAmount, 0);

      const monthExpenses = expenses
        .filter((e) => e.expenseDate >= monthStart && e.expenseDate < monthEnd)
        .reduce((sum, e) => sum + e.amount, 0);

      monthlyTrend.push({
        month: monthNames[date.getMonth()],
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      });
    }

    // 2. Top Spending Categories (from Expense table, grouped by category, top 5)
    const periodDays = parseInt(period);
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const expensesByCategory = await db.expense.groupBy({
      by: ["category"],
      where: {
        restaurantId,
        deletedAt: null,
        expenseDate: { gte: periodStart },
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });

    const topSpendingCategories = expensesByCategory.map((e) => ({
      category: e.category.replace(/_/g, " "),
      amount: e._sum.amount || 0,
      count: e._count.id,
    }));

    // 3. Equipment Maintenance Cost (from completed bookings grouped by equipment, top 5)
    const equipmentCosts = await db.serviceBooking.groupBy({
      by: ["equipmentId"],
      where: {
        restaurantId,
        status: "COMPLETED",
        equipmentId: { not: null },
        createdAt: { gte: periodStart },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    });

    // Fetch equipment names for the top items
    const equipmentIds = equipmentCosts
      .map((e) => e.equipmentId)
      .filter((id): id is string => id !== null);

    const equipmentDetails = equipmentIds.length > 0
      ? await db.equipment.findMany({
          where: { id: { in: equipmentIds } },
          select: { id: true, name: true },
        })
      : [];

    const equipmentMap = new Map(equipmentDetails.map((e) => [e.id, e.name]));

    const equipmentMaintenanceCost = equipmentCosts.map((e) => ({
      equipmentName: equipmentMap.get(e.equipmentId!) || "Unknown Equipment",
      totalCost: e._sum.totalAmount || 0,
      serviceCount: e._count.id,
    }));

    // 4. Vendor Spending Comparison (from MarketplaceOrder, grouped by vendor, top 5)
    const vendorSpending = await db.marketplaceOrder.groupBy({
      by: ["vendorId"],
      where: {
        restaurantId,
        createdAt: { gte: periodStart },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    });

    // Fetch vendor names
    const vendorIds = vendorSpending.map((v) => v.vendorId);
    const vendorDetails = vendorIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, name: true },
        })
      : [];

    const vendorMap = new Map(vendorDetails.map((v) => [v.id, v.name]));

    const vendorSpendingComparison = vendorSpending.map((v) => ({
      vendorName: vendorMap.get(v.vendorId) || "Unknown Vendor",
      totalSpent: v._sum.totalAmount || 0,
      orderCount: v._count.id,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        monthlyTrend,
        topSpendingCategories,
        equipmentMaintenanceCost,
        vendorSpendingComparison,
      },
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json(
        { ok: false, error: error.message || "Unauthorized" },
        { status: error.status }
      );
    }
    console.error("Revenue analytics error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch revenue analytics" },
      { status: 500 }
    );
  }
}
