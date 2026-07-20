import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";
import { getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { createNotification } from "@/server/notifications/service";
import { finalizeRecruitmentPayment } from "@/server/recruitment/onboarding";
import { activateAMCContract } from "@/server/amc/activate-contract";

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
  const referenceId = notes.referenceId;

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
      await handleServiceBookingWebhook(paymentId, orderId, payment, userId, referenceId);
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
    case "RECRUITMENT_FEE":
      await finalizeRecruitmentPayment(orderId, paymentId);
      break;
    case "MARKETPLACE":
    case "MARKETPLACE_INSTALLMENT":
      // Marketplace (cart checkout, and negotiated advance/final installments)
      // can't be safely auto-processed from webhook notes alone — cart orders
      // need item data that isn't in notes, and installments need the
      // originating PriceUnlockRequest/MarketplacePayment record resolved
      // under the same validation the sync verify path applies. Log for
      // admin review — the client retry mechanism should handle most cases.
      console.warn(`Webhook: ${type} payment ${paymentId} received but cannot auto-process. Admin review needed.`);
      await notifyAdminsOfUnprocessedPayment(type, paymentId, payment.amount);
      break;
    default:
      console.warn("Webhook: unknown payment type", type);
  }
}

async function notifyAdminsOfUnprocessedPayment(type: string, paymentId: string, amountPaise: number) {
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    createNotification({
      userId: admin.id,
      title: "Unprocessed Payment",
      message: `Razorpay payment ${paymentId} (${type}, ₹${(amountPaise / 100).toLocaleString("en-IN")}) was captured but could not be auto-verified. Please check Razorpay dashboard.`,
      type: "PAYMENT",
      linkUrl: "/admin/marketplace",
    }).catch(console.error);
  }
}

async function isPaymentAlreadyProcessed(razorpayPaymentId: string): Promise<boolean> {
  const [mp, pp, amc, comm, sub, rec] = await Promise.all([
    db.marketplacePayment.findFirst({ where: { razorpayPaymentId } }),
    db.paymentProof.findFirst({ where: { razorpayPaymentId } }),
    db.aMCPayment.findFirst({ where: { razorpayPaymentId } }),
    db.vendorCommissionCollection.findFirst({ where: { razorpayPaymentId } }),
    db.vendorSubscriptionRequest.findFirst({ where: { razorpayPaymentId } }),
    db.recruitmentPayment.findFirst({ where: { razorpayPaymentId } }),
  ]);
  return !!(mp || pp || amc || comm || sub || rec);
}

async function handleServiceBookingWebhook(
  paymentId: string,
  razorpayOrderId: string,
  payment: any,
  userId?: string,
  referenceId?: string
) {
  let booking;

  if (referenceId) {
    // Preferred path: the order's notes carry the exact bookingId (set at
    // order-creation time), so there's no ambiguity about which booking this
    // payment belongs to.
    booking = await db.serviceBooking.findUnique({
      where: { id: referenceId },
      include: { restaurant: { select: { name: true, ownerId: true } } },
    });
    if (!booking) {
      console.warn(`Webhook: SERVICE_BOOKING referenceId ${referenceId} not found`);
      return;
    }
    if (booking.status !== "SLOT_SELECTED" && booking.status !== "PAYMENT_REJECTED") {
      console.warn(`Webhook: SERVICE_BOOKING ${booking.id} is not payable (status: ${booking.status}), skipping`);
      return;
    }
  } else {
    // Fallback for orders created before referenceId notes existed: guess the
    // most recent SLOT_SELECTED booking for this user. This is unsafe if the
    // owner has more than one pending booking at once, so it's always
    // amount-checked below before anything is marked verified.
    if (!userId) {
      console.warn("Webhook: SERVICE_BOOKING missing both referenceId and userId");
      return;
    }
    booking = await db.serviceBooking.findFirst({
      where: { restaurant: { ownerId: userId }, status: "SLOT_SELECTED" },
      orderBy: { createdAt: "desc" },
      include: { restaurant: { select: { name: true, ownerId: true } } },
    });
    if (!booking) {
      console.warn(`Webhook: No SLOT_SELECTED booking found for user ${userId}`);
      return;
    }
  }

  // Never trust the lookup alone - confirm Razorpay actually captured the
  // exact amount this booking expects before marking it paid. This is the
  // last line of defense against crediting the wrong booking (most relevant
  // for the fallback path above, but cheap insurance either way).
  const expectedPaise = Math.round(booking.totalAmount * 100);
  if (payment.amount !== expectedPaise) {
    console.error(
      `Webhook: SERVICE_BOOKING ${booking.id} amount mismatch - captured ₹${payment.amount / 100}, expected ₹${booking.totalAmount}. Not auto-verifying.`
    );
    await notifyAdminsOfUnprocessedPayment("SERVICE_BOOKING", paymentId, payment.amount);
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

  try {
    await activateAMCContract(amcPayment.id, {
      paymentMethod: "RAZORPAY",
      razorpay: {
        orderId: razorpayOrderId,
        paymentId,
      },
    });
    console.log(`Webhook: AMC payment ${amcPayment.id} verified, contract activated`);
  } catch (error) {
    // Never throw from a webhook handler - log and let Razorpay's retry (or
    // the sync verify path, if it eventually completes) resolve it instead.
    console.error(`Webhook: failed to activate AMC contract for payment ${amcPayment.id}:`, error);
  }
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
