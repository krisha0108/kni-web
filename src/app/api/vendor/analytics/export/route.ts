import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/server/auth/rbac";
import { renderToStream } from "@react-pdf/renderer";
import { VendorAnalyticsDocument } from "@/lib/pdf/vendor-analytics-document";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const session = await requireVendor();
    const period = request.nextUrl.searchParams.get("period") || "30";

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get vendor name
    const vendor = await db.user.findUnique({
      where: { id: session.id },
      select: { name: true },
    });

    if (!vendor) {
      return NextResponse.json(
        { ok: false, error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Fetch analytics data
    const [orderStats, productCount, coverage] = await Promise.all([
      db.marketplaceOrder.aggregate({
        where: { vendorId: session.id, createdAt: { gte: startDate } },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      db.vendorProduct.count({
        where: { vendorId: session.id, isActive: true },
      }),
      db.vendorCoverage.findUnique({
        where: { vendorId: session.id },
        select: { coverageType: true, cities: true, pincodes: true },
      }),
    ]);

    const ordersByStatus = await db.marketplaceOrder.groupBy({
      by: ["status"],
      where: { vendorId: session.id, createdAt: { gte: startDate } },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const topProducts = await db.marketplaceOrderItem.groupBy({
      by: ["vendorProductId"],
      where: {
        order: { vendorId: session.id, createdAt: { gte: startDate } },
      },
      _sum: { qty: true, priceSnapshot: true },
      _count: { orderId: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 10,
    });

    const productDetails = await db.vendorProduct.findMany({
      where: {
        id: { in: topProducts.map((p) => p.vendorProductId) },
      },
      select: { id: true, name: true, price: true, unit: true },
    });

    const topCustomers = await db.marketplaceOrder.groupBy({
      by: ["restaurantId"],
      where: { vendorId: session.id, createdAt: { gte: startDate } },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 10,
    });

    const restaurantDetails = await db.restaurant.findMany({
      where: {
        id: { in: topCustomers.map((c) => c.restaurantId) },
      },
      select: { id: true, name: true, city: true },
    });

    const recentOrders = await db.marketplaceOrder.findMany({
      where: { vendorId: session.id, createdAt: { gte: startDate } },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        restaurant: {
          select: { name: true, city: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Calculate coverage
    let coverageData: { type: string; locations: number } | null = null;
    if (coverage) {
      const citiesArray = coverage.cities as string[] | null;
      const pincodesArray = coverage.pincodes as string[] | null;

      coverageData = {
        type: coverage.coverageType,
        locations:
          coverage.coverageType === "CITY_WIDE"
            ? citiesArray?.length || 0
            : pincodesArray?.length || 0,
      };
    }

    const analyticsData = {
      vendorName: vendor.name,
      period: `Last ${periodDays} days`,
      generatedAt: new Date().toISOString(),
      summary: {
        orders: {
          count: Number(orderStats._count.id),
          revenue: orderStats._sum.totalAmount || 0,
        },
        products: {
          activeCount: productCount,
        },
        coverage: coverageData,
      },
      breakdowns: {
        ordersByStatus: ordersByStatus.map((item) => ({
          status: item.status,
          count: Number(item._count.id),
          revenue: item._sum.totalAmount || 0,
        })),
        topProducts: topProducts.map((item) => {
          const product = productDetails.find((p) => p.id === item.vendorProductId);
          return {
            product: product || null,
            totalQuantity: item._sum?.qty || 0,
            totalRevenue: (item._sum?.qty || 0) * (item._sum?.priceSnapshot || 0),
            orderCount: Number(item._count?.orderId || 0),
          };
        }),
        topCustomers: topCustomers.map((item) => {
          const restaurant = restaurantDetails.find((r) => r.id === item.restaurantId);
          return {
            restaurant: restaurant || null,
            orderCount: Number(item._count.id),
            totalRevenue: item._sum.totalAmount || 0,
          };
        }),
      },
      recent: {
        orders: recentOrders.map((o) => ({
          id: o.id,
          status: o.status,
          totalAmount: o.totalAmount,
          createdAt: o.createdAt.toISOString(),
          restaurant: o.restaurant,
        })),
      },
    };

    // Generate PDF
    const stream = await renderToStream(
      VendorAnalyticsDocument({ data: analyticsData })
    );

    // Create filename
    const filename = `vendor-analytics-${vendor.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

    // Return PDF as download
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export vendor analytics error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
