import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireVendor();
    const period = request.nextUrl.searchParams.get("period") || "30"; // days

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Parallel queries for better performance
    const [
      orderStats,
      productCount,
      coverageInfo,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      // Order statistics
      db.marketplaceOrder.aggregate({
        where: {
          vendorId: session.id,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),

      // Active product count
      db.vendorProduct.count({
        where: {
          vendorId: session.id,
          isActive: true,
        },
      }),

      // Coverage information
      db.vendorCoverage.findUnique({
        where: { vendorId: session.id },
        select: {
          coverageType: true,
          cities: true,
          pincodes: true,
        },
      }),

      // Recent orders (last 10)
      db.marketplaceOrder.findMany({
        where: { vendorId: session.id },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          restaurant: {
            select: {
              name: true,
              city: true,
            },
          },
        },
      }),

      // Top selling products
      db.marketplaceOrderItem.groupBy({
        by: ["vendorProductId"],
        where: {
          order: {
            vendorId: session.id,
            createdAt: { gte: startDate },
          },
        },
        _sum: {
          qty: true,
          priceSnapshot: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            qty: "desc",
          },
        },
        take: 10,
      }),
    ]);

    // Get product details for top products
    const topProductDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await db.vendorProduct.findUnique({
          where: { id: item.vendorProductId },
          select: {
            id: true,
            name: true,
            price: true,
            unit: true,
          },
        });
        return {
          product,
          totalQuantity: item._sum.qty || 0,
          totalRevenue: (item._sum.qty || 0) * (item._sum.priceSnapshot || 0),
          orderCount: item._count.id,
        };
      })
    );

    // Order status breakdown
    const ordersByStatus = await db.marketplaceOrder.groupBy({
      by: ["status"],
      where: {
        vendorId: session.id,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    // Orders by restaurant (top 10 customers)
    const ordersByRestaurant = await db.marketplaceOrder.groupBy({
      by: ["restaurantId"],
      where: {
        vendorId: session.id,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: {
        _sum: {
          totalAmount: "desc",
        },
      },
      take: 10,
    });

    // Get restaurant details
    const topCustomers = await Promise.all(
      ordersByRestaurant.map(async (item) => {
        const restaurant = await db.restaurant.findUnique({
          where: { id: item.restaurantId },
          select: {
            id: true,
            name: true,
            city: true,
          },
        });
        return {
          restaurant,
          orderCount: item._count.id,
          totalRevenue: item._sum.totalAmount || 0,
        };
      })
    );

    // Daily order trend (last 7 days)
    const dailyOrderTrend = await db.$queryRaw<
      Array<{ date: Date; count: number; revenue: number }>
    >`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) as count,
        SUM(totalAmount) as revenue
      FROM MarketplaceOrder
      WHERE vendorId = ${session.id}
        AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `;

    // Coverage stats
    const coverageStats = coverageInfo
      ? {
          type: coverageInfo.coverageType,
          locations:
            coverageInfo.coverageType === "CITY_WIDE"
              ? (coverageInfo.cities as string[])?.length || 0
              : (coverageInfo.pincodes as string[])?.length || 0,
        }
      : null;

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          orders: {
            count: orderStats._count.id,
            revenue: orderStats._sum.totalAmount || 0,
          },
          products: {
            activeCount: productCount,
          },
          coverage: coverageStats,
        },
        breakdowns: {
          ordersByStatus: ordersByStatus.map((item) => ({
            status: item.status,
            count: item._count.id,
            revenue: item._sum.totalAmount || 0,
          })),
          topProducts: topProductDetails,
          topCustomers,
        },
        trends: {
          dailyOrders: dailyOrderTrend,
        },
        recent: {
          orders: recentOrders,
        },
      },
    });
  } catch (error) {
    console.error("Vendor analytics error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
