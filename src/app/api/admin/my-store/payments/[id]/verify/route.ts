import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { getOrCreateSystemVendor } from "@/server/my-store";
import { createNotification } from "@/server/notifications/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    await getOrCreateSystemVendor(session.id);
    const { id } = await params;

    const payment = await db.marketplacePayment.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true } },
        restaurant: { select: { name: true } },
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
        { ok: false, error: "This payment does not belong to your store" },
        { status: 403 }
      );
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: `Payment is already ${payment.status.toLowerCase()}` },
        { status: 400 }
      );
    }

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

    // Transaction: Update order status + ledger + expense + cleanup cart + stock decrement + update payment
    const order = await db.$transaction(async (tx) => {
      // Decrement stock for each ordered item
      for (const item of items) {
        await tx.vendorProduct.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.qty } },
        });
      }

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
          status: "CONFIRMED",
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

      const vendor = await tx.user.findUnique({
        where: { id: payment.vendorId },
        select: { name: true, phone: true },
      });

      const previousEntries = await tx.vendorLedger.findMany({
        where: {
          restaurantId: payment.restaurantId,
          ownerId: payment.ownerId,
          vendorName: vendor?.name || "KNI Official Store",
        },
        orderBy: { entryDate: "desc" },
        take: 1,
      });

      const previousBalance = previousEntries[0]?.balanceAfter || 0;
      const newBalance = previousBalance + payment.totalAmount;

      await tx.vendorLedger.create({
        data: {
          ownerId: payment.ownerId,
          restaurantId: payment.restaurantId,
          vendorName: vendor?.name || "KNI Official Store",
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

      await tx.expense.create({
        data: {
          ownerId: payment.ownerId,
          restaurantId: payment.restaurantId,
          category: "SUPPLIES",
          amount: payment.totalAmount,
          expenseDate: new Date(),
          description: `Marketplace order - ${items.length} items from ${vendor?.name || "KNI Official Store"}`,
        },
      });

      // Clean up cart items for this vendor
      const cart = await tx.marketplaceCart.findUnique({
        where: {
          ownerId_restaurantId: {
            ownerId: payment.ownerId,
            restaurantId: payment.restaurantId,
          },
        },
      });

      if (cart) {
        await tx.marketplaceCartItem.deleteMany({
          where: {
            cartId: cart.id,
            product: {
              vendorId: payment.vendorId,
            },
          },
        });
      }

      await tx.marketplacePayment.update({
        where: { id: payment.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          orderId: newOrder.id,
        },
      });

      return newOrder;
    });

    // Notify owner
    createNotification({
      userId: payment.ownerId,
      title: "Payment Verified!",
      message: `Your payment has been verified. Order #${order.id.substring(0, 8)} has been confirmed.`,
      type: "PAYMENT",
      linkUrl: "/owner/marketplace/orders",
    }).catch(console.error);

    // Check for low stock after order (admin store)
    for (const item of items) {
      const product = await db.vendorProduct.findUnique({ where: { id: item.productId }, select: { id: true, name: true, stockQuantity: true } });
      if (product && product.stockQuantity <= 10) {
        createNotification({
          userId: session.id,
          title: "Low Stock Alert",
          message: `"${product.name}" has only ${product.stockQuantity} units left in KNI Official Store.`,
          type: "SYSTEM",
          linkUrl: "/admin/my-store/products",
        }).catch(console.error);
      }
    }

    return NextResponse.json({ ok: true, data: order });
  } catch (error) {
    console.error("Admin verify marketplace payment error:", error);
    console.error("Error details:", error instanceof Error ? error.message : JSON.stringify(error));
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
