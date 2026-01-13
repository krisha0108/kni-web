import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getSession } from '@/server/auth/session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session;

    const vendorProfile = await db.vendorProfile.findUnique({
      where: { userId: user.id },
    });

    // If not approved, redirect to pending page
    if (vendorProfile?.approvalStatus !== "APPROVED") {
      return NextResponse.json({ redirect: "/vendor/pending" });
    }

    // If subscription expired or blocked, redirect to subscription page
    if (vendorProfile?.subscriptionStatus === "EXPIRED" ||
        vendorProfile?.subscriptionStatus === "BLOCKED") {
      return NextResponse.json({ redirect: "/vendor/subscription" });
    }

    const [products, orders, ordersWithDetails, topProducts] = await Promise.all([
      db.vendorProduct.count({
        where: { vendorId: user.id, isActive: true, deletedAt: null },
      }),
      db.marketplaceOrder.count({
        where: { vendorId: user.id },
      }),
      db.marketplaceOrder.findMany({
        where: { vendorId: user.id },
        include: {
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.marketplaceOrderItem.groupBy({
        by: ['vendorProductId'],
        where: {
          order: {
            vendorId: user.id
          }
        },
        _sum: {
          qty: true,
          priceSnapshot: true
        },
        _count: true,
        orderBy: {
          _sum: {
            priceSnapshot: 'desc'
          }
        },
        take: 5
      })
    ]);

    const totalRevenue = ordersWithDetails.reduce((sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + (item.priceSnapshot || 0), 0), 0
    );

    const topProductsData = await Promise.all(
      topProducts.map(async (item) => {
        const product = await db.vendorProduct.findUnique({
          where: { id: item.vendorProductId },
          select: { name: true }
        });
        return {
          name: product?.name || 'Unknown',
          revenue: (item._sum.priceSnapshot || 0) / 100,
          quantity: item._sum.qty || 0
        };
      })
    );

    const subscriptionStatus = vendorProfile?.subscriptionStatus;
    const trialEndsAt = vendorProfile?.trialEndsAt;
    const activeUntil = vendorProfile?.activeUntil;

    const getSubscriptionInfo = () => {
      if (subscriptionStatus === "TRIAL" && trialEndsAt) {
        const daysLeft = Math.ceil(
          (trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return { label: "Trial", daysLeft, variant: "warning" as const };
      }
      if (subscriptionStatus === "ACTIVE" && activeUntil) {
        const daysLeft = Math.ceil(
          (activeUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return { label: "Active", daysLeft, variant: "success" as const };
      }
      return { label: subscriptionStatus || "Unknown", daysLeft: 0, variant: "default" as const };
    };

    const subInfo = getSubscriptionInfo();

    return NextResponse.json({
      ok: true,
      data: {
        userName: user.name,
        products,
        orders,
        totalRevenue: totalRevenue / 100,
        topProductsData,
        subInfo
      }
    });
  } catch (error) {
    console.error('Vendor dashboard error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
