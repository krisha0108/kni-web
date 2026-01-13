import { db } from "@/server/db";

// ========================================
// PREDICTIVE ANALYTICS
// ========================================

/**
 * Predict monthly revenue based on historical data
 */
export async function predictMonthlyRevenue(restaurantId?: string) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Get booking revenue from last 6 months
  const bookings = await db.serviceBooking.findMany({
    where: {
      ...(restaurantId ? { restaurantId } : {}),
      status: "COMPLETED",
      createdAt: { gte: sixMonthsAgo },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  });

  // Group by month and calculate average
  const monthlyRevenue: Record<string, number> = {};
  bookings.forEach((booking) => {
    const monthKey = `${booking.createdAt.getFullYear()}-${booking.createdAt.getMonth() + 1}`;
    monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + booking.totalAmount;
  });

  const months = Object.values(monthlyRevenue);
  const avgMonthlyRevenue = months.length > 0
    ? months.reduce((sum, val) => sum + val, 0) / months.length
    : 0;

  // Simple trend analysis: compare last 3 months vs previous 3 months
  const allMonths = Object.keys(monthlyRevenue).sort();
  const recentMonths = allMonths.slice(-3);
  const previousMonths = allMonths.slice(-6, -3);

  const recentAvg = recentMonths.reduce((sum, key) => sum + monthlyRevenue[key], 0) / (recentMonths.length || 1);
  const previousAvg = previousMonths.reduce((sum, key) => sum + monthlyRevenue[key], 0) / (previousMonths.length || 1);

  const growthRate = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

  // Predict next month based on average and growth trend
  const predictedRevenue = avgMonthlyRevenue * (1 + growthRate / 100);

  return {
    avgMonthlyRevenue,
    predictedNextMonth: Math.round(predictedRevenue),
    growthRate: Math.round(growthRate * 10) / 10,
    trend: growthRate > 5 ? "GROWING" : growthRate < -5 ? "DECLINING" : "STABLE",
    monthlyBreakdown: monthlyRevenue,
  };
}

/**
 * Get equipment maintenance predictions
 */
export async function predictEquipmentMaintenance(restaurantId: string) {
  const equipment = await db.equipment.findMany({
    where: {
      restaurantId,
      status: { in: ["AVAILABLE", "IN_USE"] },
    },
    include: {
      amcSubscription: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
  });

  const predictions = equipment.map((item) => {
    const purchaseDate = new Date(item.purchaseDate);
    const ageInMonths = Math.floor(
      (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    // Simple prediction based on age and warranty
    let maintenanceRisk = "LOW";
    if (ageInMonths > 36) maintenanceRisk = "HIGH";
    else if (ageInMonths > 24) maintenanceRisk = "MEDIUM";

    const hasActiveAMC = item.amcSubscription.length > 0;
    const warrantyActive = item.warrantyEndDate && new Date(item.warrantyEndDate) > new Date();

    return {
      equipmentId: item.id,
      name: item.name,
      category: item.category,
      ageInMonths,
      maintenanceRisk,
      hasActiveAMC,
      warrantyActive,
      recommendation: !hasActiveAMC && maintenanceRisk === "HIGH"
        ? "Consider AMC subscription"
        : maintenanceRisk === "MEDIUM"
        ? "Schedule preventive maintenance"
        : "No immediate action required",
    };
  });

  return predictions;
}

/**
 * Analyze customer churn risk
 */
export async function analyzeChurnRisk() {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get owners who haven't booked in 60 days
  const inactiveOwners = await db.user.findMany({
    where: {
      role: "OWNER",
      isActive: true,
      serviceBookings: {
        none: {
          createdAt: { gte: sixtyDaysAgo },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          serviceBookings: true,
        },
      },
    },
    take: 50,
  });

  // Categorize by risk
  const highRisk = inactiveOwners.filter((owner) => owner._count.serviceBookings > 5);
  const mediumRisk = inactiveOwners.filter(
    (owner) => owner._count.serviceBookings >= 2 && owner._count.serviceBookings <= 5
  );
  const lowRisk = inactiveOwners.filter((owner) => owner._count.serviceBookings < 2);

  return {
    summary: {
      high: highRisk.length,
      medium: mediumRisk.length,
      low: lowRisk.length,
      total: inactiveOwners.length,
    },
    highRiskCustomers: highRisk.slice(0, 10).map((o) => ({
      id: o.id,
      name: o.name,
      email: o.email,
      totalBookings: o._count.serviceBookings,
      recommendation: "Send re-engagement offer",
    })),
  };
}

/**
 * Get inventory insights with low stock predictions
 */
export async function getInventoryInsights() {
  const inventory = await db.warehouseInventory.findMany({
    include: {
      partItem: {
        select: {
          name: true,
          category: { select: { name: true } },
        },
      },
      stockMovements: {
        where: {
          movementType: "OUTWARD_USAGE",
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        select: {
          quantity: true,
          createdAt: true,
        },
      },
    },
  });

  const insights = inventory.map((item) => {
    const usage = item.stockMovements.reduce((sum, m) => sum + m.quantity, 0);
    const avgDailyUsage = usage / 30;
    const daysUntilStockout = avgDailyUsage > 0 ? item.currentStock / avgDailyUsage : 999;

    let urgency = "NORMAL";
    if (item.currentStock <= item.lowStockThreshold) urgency = "CRITICAL";
    else if (daysUntilStockout < 7) urgency = "HIGH";
    else if (daysUntilStockout < 14) urgency = "MEDIUM";

    return {
      id: item.id,
      name: item.partItem.name,
      category: item.partItem.category?.name,
      currentStock: item.currentStock,
      lowStockThreshold: item.lowStockThreshold,
      avgDailyUsage: Math.round(avgDailyUsage * 10) / 10,
      daysUntilStockout: Math.round(daysUntilStockout),
      urgency,
      recommendedReorder: Math.max(
        item.lowStockThreshold * 2,
        Math.ceil(avgDailyUsage * 30)
      ),
    };
  });

  // Sort by urgency
  insights.sort((a, b) => {
    const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, NORMAL: 3 };
    return urgencyOrder[a.urgency as keyof typeof urgencyOrder] -
           urgencyOrder[b.urgency as keyof typeof urgencyOrder];
  });

  return insights;
}

/**
 * Get business performance summary with trends
 */
export async function getBusinessPerformanceSummary(period: "week" | "month" | "quarter" = "month") {
  const now = new Date();
  const periodStart = new Date();
  const previousPeriodStart = new Date();

  switch (period) {
    case "week":
      periodStart.setDate(now.getDate() - 7);
      previousPeriodStart.setDate(now.getDate() - 14);
      break;
    case "month":
      periodStart.setMonth(now.getMonth() - 1);
      previousPeriodStart.setMonth(now.getMonth() - 2);
      break;
    case "quarter":
      periodStart.setMonth(now.getMonth() - 3);
      previousPeriodStart.setMonth(now.getMonth() - 6);
      break;
  }

  // Current period metrics
  const [
    currentRevenue,
    currentBookings,
    currentOrders,
    previousRevenue,
    previousBookings,
    previousOrders,
  ] = await Promise.all([
    // Current period
    db.serviceBooking.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: periodStart },
      },
      _sum: { totalAmount: true },
    }),
    db.serviceBooking.count({
      where: {
        status: "COMPLETED",
        createdAt: { gte: periodStart },
      },
    }),
    db.marketplaceOrder.count({
      where: {
        status: "DELIVERED",
        createdAt: { gte: periodStart },
      },
    }),
    // Previous period
    db.serviceBooking.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: previousPeriodStart, lt: periodStart },
      },
      _sum: { totalAmount: true },
    }),
    db.serviceBooking.count({
      where: {
        status: "COMPLETED",
        createdAt: { gte: previousPeriodStart, lt: periodStart },
      },
    }),
    db.marketplaceOrder.count({
      where: {
        status: "DELIVERED",
        createdAt: { gte: previousPeriodStart, lt: periodStart },
      },
    }),
  ]);

  const calcGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    period,
    current: {
      revenue: currentRevenue._sum.totalAmount || 0,
      bookings: currentBookings,
      orders: currentOrders,
    },
    previous: {
      revenue: previousRevenue._sum.totalAmount || 0,
      bookings: previousBookings,
      orders: previousOrders,
    },
    growth: {
      revenue: calcGrowth(
        currentRevenue._sum.totalAmount || 0,
        previousRevenue._sum.totalAmount || 0
      ),
      bookings: calcGrowth(currentBookings, previousBookings),
      orders: calcGrowth(currentOrders, previousOrders),
    },
    insights: {
      revenueHealth:
        calcGrowth(currentRevenue._sum.totalAmount || 0, previousRevenue._sum.totalAmount || 0) > 10
          ? "EXCELLENT"
          : calcGrowth(currentRevenue._sum.totalAmount || 0, previousRevenue._sum.totalAmount || 0) > 0
          ? "GOOD"
          : "NEEDS_ATTENTION",
      topPerformingDay: await getTopPerformingDay(periodStart),
    },
  };
}

async function getTopPerformingDay(since: Date) {
  const bookings = await db.serviceBooking.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { gte: since },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  });

  const dailyRevenue: Record<string, number> = {};
  bookings.forEach((booking) => {
    const day = booking.createdAt.toISOString().split("T")[0];
    dailyRevenue[day] = (dailyRevenue[day] || 0) + booking.totalAmount;
  });

  const topDay = Object.entries(dailyRevenue).sort((a, b) => b[1] - a[1])[0];
  return topDay ? { date: topDay[0], revenue: topDay[1] } : null;
}

/**
 * Get engineer performance analytics
 */
export async function getEngineerPerformanceAnalytics() {
  const engineers = await db.user.findMany({
    where: { role: "ENGINEER", isActive: true },
    select: {
      id: true,
      name: true,
      engineerAssignments: {
        where: { status: "COMPLETED" },
        select: {
          commissionAmount: true,
          completedAt: true,
          rating: {
            select: {
              overallRating: true,
            },
          },
        },
      },
    },
  });

  const analytics = engineers.map((engineer) => {
    const completedJobs = engineer.engineerAssignments.length;
    const totalEarnings = engineer.engineerAssignments.reduce(
      (sum, a) => sum + (a.commissionAmount || 0),
      0
    );
    const ratings = engineer.engineerAssignments
      .filter((a) => a.rating)
      .map((a) => a.rating!.overallRating);
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    return {
      id: engineer.id,
      name: engineer.name,
      completedJobs,
      totalEarnings,
      avgRating: Math.round(avgRating * 10) / 10,
      performance:
        avgRating >= 4.5 && completedJobs >= 20
          ? "EXCELLENT"
          : avgRating >= 4.0 && completedJobs >= 10
          ? "GOOD"
          : avgRating >= 3.5
          ? "AVERAGE"
          : "NEEDS_IMPROVEMENT",
    };
  });

  return analytics.sort((a, b) => b.avgRating - a.avgRating);
}
