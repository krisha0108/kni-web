import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";
import { getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { createNotification } from "@/server/notifications/service";

/**
 * Razorpay Webhook Handler
 * Processes payment.captured events as a safety net when client-side verification fails.
 * No session auth — uses RAZORPAY_WEBHOOK_SECRET for signature verification.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      return NextResponse.json({ ok: true }); // Don't expose config issues
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      await handlePaymentCaptured(event.payload.payment.entity);
    }

    // Always return 200 to prevent Razorpay retry storm
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 200 anyway to acknowledge receipt
    return NextResponse.json({ ok: true });
  }
}

async function handlePaymentCaptured(payment: any) {
  const paymentId = payment.id;
  const orderId = payment.order_id;
  const notes = payment.notes || {};
  const type = notes.type;
  const userId = notes.userId;

  if (!type || !orderId) {
    console.warn("Webhook: missing type or orderId in notes", { notes });
    return;
  }

  // Check if this payment was already processed across all tables
  const alreadyProcessed = await isPaymentAlreadyProcessed(paymentId);
  if (alreadyProcessed) {
    console.log(`Webhook: payment ${paymentId} already processed, skipping`);
    return;
  }

  console.log(`Webhook: processing ${type} payment ${paymentId} for order ${orderId}`);

  switch (type) {
    case "SERVICE_BOOKING":
      await handleServiceBookingWebhook(paymentId, orderId, payment, userId);
      break;
    case "AMC_PAYMENT":
      await handleAMCPaymentWebhook(paymentId, orderId, payment);
      break;
    case "VENDOR_COMMISSION":
      await handleVendorCommissionWebhook(paymentId, orderId, payment);
      break;
    case "VENDOR_SUBSCRIPTION":
      await handleVendorSubscriptionWebhook(paymentId, orderId, payment);
      break;
    case "MARKETPLACE":
      // Marketplace requires items data not available in notes.
      // Log for admin review — the client retry mechanism should handle most cases.
      console.warn(`Webhook: MARKETPLACE payment ${paymentId} received but cannot auto-process (items not in notes). Admin review needed.`);
      // Notify admins about unprocessed marketplace payment
      const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      for (const admin of admins) {
        createNotification({
          userId: admin.id,
          title: "Unprocessed Marketplace Payment",
          message: `Razorpay payment ${paymentId} (₹${(payment.amount / 100).toLocaleString("en-IN")}) was captured but could not be auto-verified. Please check Razorpay dashboard.`,
          type: "PAYMENT",
          linkUrl: "/admin/marketplace",
        }).catch(console.error);
      }
      break;
    default:
      console.warn("Webhook: unknown payment type", type);
  }
}

async function isPaymentAlreadyProcessed(razorpayPaymentId: string): Promise<boolean> {
  const [mp, pp, amc, comm, sub] = await Promise.all([
    db.marketplacePayment.findFirst({ where: { razorpayPaymentId } }),
    db.paymentProof.findFirst({ where: { razorpayPaymentId } }),
    db.aMCPayment.findFirst({ where: { razorpayPaymentId } }),
    db.vendorCommissionCollection.findFirst({ where: { razorpayPaymentId } }),
    db.vendorSubscriptionRequest.findFirst({ where: { razorpayPaymentId } }),
  ]);
  return !!(mp || pp || amc || comm || sub);
}

async function handleServiceBookingWebhook(
  paymentId: string,
  razorpayOrderId: string,
  payment: any,
  userId?: string
) {
  // Find booking by looking at recent SLOT_SELECTED bookings for this user
  // The bookingId is not in notes, so we search by owner
  if (!userId) {
    console.warn("Webhook: SERVICE_BOOKING missing userId");
    return;
  }

  // Find the most recent SLOT_SELECTED booking for this user
  const booking = await db.serviceBooking.findFirst({
    where: {
      restaurant: { ownerId: userId },
      status: "SLOT_SELECTED",
    },
    orderBy: { createdAt: "desc" },
    include: { restaurant: { select: { name: true, ownerId: true } } },
  });

  if (!booking) {
    console.warn(`Webhook: No SLOT_SELECTED booking found for user ${userId}`);
    return;
  }

  const actualOwnerId = booking.restaurant.ownerId;

  await db.$transaction(async (tx) => {
    await tx.paymentProof.create({
      data: {
        bookingId: booking.id,
        ownerId: actualOwnerId,
        screenshotUrl: null,
        status: "VERIFIED",
        paymentMethod: "RAZORPAY",
        razorpayOrderId,
        razorpayPaymentId: paymentId,
        verifiedAt: new Date(),
      },
    });

    await tx.serviceBooking.update({
      where: { id: booking.id },
      data: { status: "PAYMENT_VERIFIED" },
    });
  });

  createNotification({
    userId: actualOwnerId,
    title: "Payment Verified (Auto)",
    message: `Your Razorpay payment for service booking has been automatically verified.`,
    type: "PAYMENT",
    linkUrl: `/owner/bookings/${booking.id}`,
  }).catch(console.error);

  console.log(`Webhook: SERVICE_BOOKING ${booking.id} payment verified`);
}

async function handleAMCPaymentWebhook(
  paymentId: string,
  razorpayOrderId: string,
  payment: any
) {
  const amcPayment = await db.aMCPayment.findFirst({
    where: {
      razorpayOrderId,
      status: { in: ["PENDING", "REJECTED"] },
    },
  });

  if (!amcPayment) {
    console.warn(`Webhook: No pending AMC payment for order ${razorpayOrderId}`);
    return;
  }

  await db.aMCPayment.update({
    where: { id: amcPayment.id },
    data: {
      status: "VERIFIED",
      razorpayPaymentId: paymentId,
      verifiedAt: new Date(),
    },
  });

  console.log(`Webhook: AMC payment ${amcPayment.id} verified`);
}

async function handleVendorCommissionWebhook(
  paymentId: string,
  razorpayOrderId: string,
  payment: any
) {
  const collection = await db.vendorCommissionCollection.findFirst({
    where: {
      razorpayOrderId,
      status: { in: ["REQUESTED", "PAYMENT_REJECTED"] },
    },
  });

  if (!collection) {
    console.warn(`Webhook: No pending commission collection for order ${razorpayOrderId}`);
    return;
  }

  await db.vendorCommissionCollection.update({
    where: { id: collection.id },
    data: {
      status: "VERIFIED",
      razorpayPaymentId: paymentId,
      verifiedAt: new Date(),
    },
  });

  console.log(`Webhook: Commission collection ${collection.id} verified`);
}

async function handleVendorSubscriptionWebhook(
  paymentId: string,
  razorpayOrderId: string,
  payment: any
) {
  const subRequest = await db.vendorSubscriptionRequest.findFirst({
    where: {
      razorpayOrderId,
      status: { in: ["PRICE_SENT", "PAYMENT_REJECTED"] },
    },
  });

  if (!subRequest) {
    console.warn(`Webhook: No pending subscription for order ${razorpayOrderId}`);
    return;
  }

  const activeUntil = new Date();
  activeUntil.setMonth(activeUntil.getMonth() + subRequest.durationMonths);

  await db.$transaction(async (tx) => {
    await tx.vendorSubscriptionRequest.update({
      where: { id: subRequest.id },
      data: {
        status: "ACTIVATED",
        razorpayPaymentId: paymentId,
        verifiedAt: new Date(),
        activatedAt: new Date(),
        activeUntil,
      },
    });

    await tx.user.update({
      where: { id: subRequest.vendorId },
      data: {
        vendorProfile: {
          update: {
            subscriptionStatus: "ACTIVE",
            activeUntil,
          },
        },
      },
    });
  });

  console.log(`Webhook: Subscription ${subRequest.id} activated`);
}
