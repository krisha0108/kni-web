import { db } from "@/server/db";
import { createNotification } from "@/server/notifications/service";
import { refundRazorpayPayment } from "@/lib/razorpay";

/**
 * Called when a MarketplaceOrder transitions to DELIVERED. If this order was
 * paid via the negotiated quote flow (has a VERIFIED ADVANCE payment) and
 * doesn't already have a FINAL payment, creates one for the remaining
 * balance and notifies the owner to pay it.
 *
 * No-op for regular (non-negotiated) orders, which only ever have a FULL
 * payment or no payment record at all.
 */
export async function maybeCreateFinalMarketplacePayment(orderId: string) {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { vendor: { select: { name: true } } },
  });

  if (!order) return;

  // MarketplacePayment.orderId is a plain field (not a Prisma relation, since
  // it's intentionally non-unique to allow both an ADVANCE and FINAL row per
  // order), so payments are looked up with a direct query.
  const payments = await db.marketplacePayment.findMany({ where: { orderId } });

  const advancePayment = payments.find((p) => p.installmentType === "ADVANCE" && p.status === "VERIFIED");
  if (!advancePayment) return; // Not a negotiated/split-payment order

  const alreadyHasFinal = payments.some((p) => p.installmentType === "FINAL");
  if (alreadyHasFinal) return; // Already created (or paid) - avoid duplicates

  const paidSoFar = payments
    .filter((p) => p.status === "VERIFIED")
    .reduce((sum, p) => sum + p.totalAmount, 0);
  const remaining = order.totalAmount - paidSoFar;
  if (remaining <= 0) return;

  await db.marketplacePayment.create({
    data: {
      ownerId: order.ownerId,
      vendorId: order.vendorId,
      restaurantId: order.restaurantId,
      totalAmount: remaining,
      items: [],
      orderId: order.id,
      installmentType: "FINAL",
      status: "PENDING",
    },
  });

  createNotification({
    userId: order.ownerId,
    title: "Final Payment Due",
    message: `Your order from ${order.vendor.name} has been delivered. Please pay the remaining ₹${remaining.toLocaleString("en-IN")}.`,
    type: "ORDER",
    linkUrl: "/owner/marketplace/orders",
    data: { type: "order", orderId: order.id },
  }).catch(console.error);
}

/**
 * Called when a MarketplaceOrder transitions to CANCELLED. If this order was
 * paid via the negotiated quote flow and has a VERIFIED Razorpay ADVANCE
 * payment, refunds it in full - the owner shouldn't be left having paid an
 * advance for an order that never happened. No-op for orders with no
 * Razorpay advance payment (screenshot-paid or not-yet-paid orders).
 */
export async function maybeRefundAdvanceOnCancel(orderId: string) {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { vendor: { select: { name: true } } },
  });
  if (!order) return;

  const advancePayment = await db.marketplacePayment.findFirst({
    where: {
      orderId,
      installmentType: "ADVANCE",
      status: "VERIFIED",
      paymentMethod: "RAZORPAY",
      razorpayPaymentId: { not: null },
    },
  });
  if (!advancePayment || !advancePayment.razorpayPaymentId) return;

  try {
    const refund = await refundRazorpayPayment(advancePayment.razorpayPaymentId, advancePayment.totalAmount, {
      reason: "order_cancelled",
      orderId,
    });

    await db.marketplacePayment.update({
      where: { id: advancePayment.id },
      data: { status: "REFUNDED", refundId: refund.id, refundedAt: new Date() },
    });

    createNotification({
      userId: order.ownerId,
      title: "Order Cancelled - Refund Issued",
      message: `Your order from ${order.vendor.name} was cancelled. Your advance of ₹${advancePayment.totalAmount.toLocaleString("en-IN")} has been refunded.`,
      type: "PAYMENT",
      linkUrl: "/owner/marketplace/orders",
      data: { type: "order", orderId: order.id },
    }).catch(console.error);
  } catch (error) {
    console.error("Failed to refund advance payment on cancel:", error);
    createNotification({
      userId: order.ownerId,
      title: "Order Cancelled - Refund Pending",
      message: `Your order from ${order.vendor.name} was cancelled. We're processing a refund of ₹${advancePayment.totalAmount.toLocaleString("en-IN")} - contact support if not reflected within a few days.`,
      type: "PAYMENT",
      linkUrl: "/owner/marketplace/orders",
      data: { type: "order", orderId: order.id },
    }).catch(console.error);
  }
}
