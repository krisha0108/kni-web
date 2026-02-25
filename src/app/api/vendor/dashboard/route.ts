import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { requireVendor } from '@/server/auth/rbac';

export async function GET() {
  try {
    const session = await requireVendor();

    const vendorProfile = await db.vendorProfile.findUnique({
      where: { userId: session.id },
    });

    const [products, orders, ordersWithDetails, topProducts] = await Promise.all([
      db.vendorProduct.count({
        where: { vendorId: session.id, isActive: true, deletedAt: null },
      }),
      db.marketplaceOrder.count({
        where: { vendorId: session.id },
      }),
      db.marketplaceOrder.findMany({
        where: { vendorId: session.id },
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
            vendorId: session.id
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
          revenue: (item._sum.priceSnapshot || 0),
          quantity: item._sum.qty || 0
        };
      })
    );

    const subscriptionStatus = vendorProfile?.subscriptionStatus;
    const trialEndsAt = vendorProfile?.trialEndsAt;
    const activeUntil = vendorProfile?.activeUntil;
    const revenueModel = vendorProfile?.revenueModel || "SUBSCRIPTION";
    const commissionRate = vendorProfile?.commissionRate;

    const getSubscriptionInfo = () => {
      // Commission model vendors don't have subscription
      if (revenueModel === "COMMISSION") {
        return { label: `Commission ${commissionRate}%`, daysLeft: 0, variant: "success" as const };
      }
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

    // Fetch commission summary for commission-model vendors
    let commissionInfo = null;
    if (revenueModel === "COMMISSION") {
      const commissions = await db.vendorCommission.findMany({
        where: { vendorId: session.id },
        include: {
          collection: { select: { status: true } },
        },
      });

      const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
      const pendingCommission = commissions
        .filter((c) => !c.collectionId)
        .reduce((sum, c) => sum + c.commissionAmount, 0);
      const paidCommission = commissions
        .filter((c) => c.collection?.status === "VERIFIED")
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      commissionInfo = {
        commissionRate,
        totalCommission,
        pendingCommission,
        paidCommission,
      };
    }

    return NextResponse.json({
      ok: true,
      data: {
        userName: session.name,
        products,
        orders,
        totalRevenue: totalRevenue,
        topProductsData,
        subInfo,
        revenueModel,
        commissionInfo,
      }
    });
  } catch (error) {
    console.error('Vendor dashboard error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: errorMessage.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
