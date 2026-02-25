import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendorMobile } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVendorMobile(request);
    const { id } = await params;

    // Fetch payment
    const payment = await db.marketplacePayment.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true } },
        restaurant: { select: { name: true, city: true } },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.vendorId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "This payment does not belong to you" },
        { status: 403 }
      );
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: `Payment is already ${payment.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Parse items from JSON snapshot
    const items = payment.items as Array<{
      productId: string;
      qty: number;
      priceSnapshot: number;
      name: string;
    }>;

    // Validate products still available
    const products = await db.vendorProduct.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { ok: false, error: `Product "${item.name}" no longer exists` },
          { status: 400 }
        );
      }
      if (product.stockQuantity < item.qty) {
        return NextResponse.json(
          { ok: false, error: `Insufficient stock for "${item.name}". Available: ${product.stockQuantity}` },
          { status: 400 }
        );
      }
    }

    // Transaction: Create order + ledger + expense + update payment
    const order = await db.$transaction(async (tx) => {
      // 1. Create MarketplaceOrder
      const orderItems = items.map((item) => ({
        vendorProductId: item.productId,
        qty: item.qty,
        priceSnapshot: item.priceSnapshot,
      }));

      const newOrder = await tx.marketplaceOrder.create({
        data: {
          ownerId: payment.ownerId,
          vendorId: payment.vendorId,
          restaurantId: payment.restaurantId,
          status: "PLACED",
          totalAmount: payment.totalAmount,
          deliveryAddress: payment.deliveryAddress,
          notes: payment.notes,
          items: { create: orderItems },
        },
        include: {
          vendor: true,
          items: { include: { product: true } },
        },
      });

      // 2. Get vendor details for ledger
      const vendor = await tx.user.findUnique({
        where: { id: payment.vendorId },
        select: { name: true, phone: true },
      });

      // 3. Get previous balance
      const previousEntries = await tx.vendorLedger.findMany({
        where: {
          restaurantId: payment.restaurantId,
          ownerId: payment.ownerId,
          vendorName: vendor?.name || "Unknown Vendor",
        },
        orderBy: { entryDate: "desc" },
        take: 1,
      });

      const previousBalance = previousEntries[0]?.balanceAfter || 0;
      const newBalance = previousBalance + payment.totalAmount;

      // 4. Create VendorLedger entry
      await tx.vendorLedger.create({
        data: {
          ownerId: payment.ownerId,
          restaurantId: payment.restaurantId,
          vendorName: vendor?.name || "Unknown Vendor",
          vendorPhone: vendor?.phone || null,
          entryType: "PURCHASE",
          amount: payment.totalAmount,
          description: `Marketplace order - ${items.length} items`,
          billNumber: `MKT-${newOrder.id.substring(0, 8)}`,
          billDate: new Date(),
          balanceAfter: newBalance,
          entryDate: new Date(),
          createdBy: payment.ownerId,
        },
      });

      // 5. Create Expense entry
      await tx.expense.create({
        data: {
          ownerId: payment.ownerId,
          restaurantId: payment.restaurantId,
          category: "SUPPLIES",
          amount: payment.totalAmount,
          expenseDate: new Date(),
          description: `Marketplace order - ${items.length} items from ${vendor?.name}`,
        },
      });

      // 6. Update payment status
      await tx.marketplacePayment.update({
        where: { id: payment.id },
        data: {
          status: "VERIFIED",
          orderId: newOrder.id,
          verifiedAt: new Date(),
        },
      });

      return newOrder;
    });

    // Notify owner
    createNotification({
      userId: payment.ownerId,
      title: "Payment Verified!",
      message: `Your payment has been verified. Order #${order.id.substring(0, 8)} has been placed.`,
      type: "PAYMENT",
      linkUrl: "/owner/marketplace/orders",
    }).catch(console.error);

    return NextResponse.json({ ok: true, data: order });
  } catch (error) {
    console.error("Verify marketplace payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
