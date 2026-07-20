import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRoleMobile } from "@/server/auth/rbac";
import { Role } from "@prisma/client";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { verifyRazorpayPayment, refundRazorpayPayment } from "@/lib/razorpay";
import { createNotification } from "@/server/notifications/service";
import { activateAMCContract } from "@/server/amc/activate-contract";
import { computeMarketplaceAdvance } from "@/lib/marketplace-pricing";
import { z } from "zod";

const marketplaceSchema = z.object({
  type: z.literal("MARKETPLACE"),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  vendorId: z.string().min(1),
  restaurantId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string(),
    qty: z.number().int().positive(),
  })).min(1),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

const serviceBookingSchema = z.object({
  type: z.literal("SERVICE_BOOKING"),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  bookingId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Allow OWNER, ADMIN, and VENDOR
    const session = await requireRoleMobile(request, Role.OWNER, Role.ADMIN, Role.VENDOR);
    const body = await request.json();
    const { type } = body;

    if (type === "MARKETPLACE") {
      return handleMarketplacePayment(session, body);
    } else if (type === "MARKETPLACE_INSTALLMENT") {
      return handleMarketplaceInstallmentPayment(session, body);
    } else if (type === "SERVICE_BOOKING") {
      return handleServiceBookingPayment(session, body);
    } else if (type === "AMC_PAYMENT") {
      return handleAMCPayment(session, body);
    } else if (type === "VENDOR_COMMISSION") {
      return handleVendorCommission(session, body);
    } else if (type === "VENDOR_SUBSCRIPTION") {
      return handleVendorSubscription(session, body);
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid payment type" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Razorpay verify error:", error);
    const message = error instanceof Error ? error.message : "Payment verification failed";
    const isAuthError = message.includes("Unauthorized") || message.includes("Forbidden");
    return NextResponse.json(
      { ok: false, error: message },
      { status: isAuthError ? 401 : 500 }
    );
  }
}

// ======================== MARKETPLACE (KNI Official Store) ========================
async function handleMarketplacePayment(session: any, body: any) {
  const validation = marketplaceSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const {
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    vendorId, restaurantId, items, deliveryAddress, notes,
  } = validation.data;

  // 1. Check for duplicate payment (prevent double pay)
  const existingMarketplacePayment = await db.marketplacePayment.findFirst({
    where: { razorpayPaymentId: razorpay_payment_id },
  });
  if (existingMarketplacePayment) {
    return NextResponse.json({
      ok: true,
      data: { orderId: existingMarketplacePayment.orderId, paymentVerified: true },
    });
  }

  // 2. Check restaurant access
  await requireRestaurantAccess(session, restaurantId, "marketplace:create");

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId, status: "APPROVED" },
  });
  if (!restaurant) {
    return NextResponse.json(
      { ok: false, error: "Restaurant not found or not approved" },
      { status: 400 }
    );
  }

  // 3. Verify this is system vendor (KNI Official Store)
  const vendorProfile = await db.vendorProfile.findUnique({
    where: { userId: vendorId },
    select: { isSystemVendor: true },
  });
  if (!vendorProfile?.isSystemVendor) {
    return NextResponse.json(
      { ok: false, error: "Razorpay payment is only available for KNI Official Store" },
      { status: 400 }
    );
  }

  // 4. Validate products & calculate total
  const products = await db.vendorProduct.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: {
      product: { select: { name: true } },
      vendor: { select: { vendorProfile: { select: { isSystemVendor: true } } } },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Fetch price unlocks for price-on-request products
  const priceOnRequestIds = products
    .filter((p) => p.priceOnRequest && p.vendor?.vendorProfile?.isSystemVendor)
    .map((p) => p.id);

  const unlockMap = new Map<string, number>();
  if (priceOnRequestIds.length > 0) {
    const unlocks = await db.priceUnlockRequest.findMany({
      where: {
        ownerId: session.id,
        vendorProductId: { in: priceOnRequestIds },
        status: "UNLOCKED",
      },
      select: { vendorProductId: true, unlockedPrice: true, validUntil: true },
    });
    for (const u of unlocks) {
      if (u.validUntil && u.validUntil < new Date()) {
        const pName = productMap.get(u.vendorProductId)?.product?.name || "product";
        return NextResponse.json(
          { ok: false, error: `Your price quote for "${pName}" has expired.` },
          { status: 400 }
        );
      }
      if (u.unlockedPrice) unlockMap.set(u.vendorProductId, u.unlockedPrice);
    }
  }

  let totalAmount = 0;
  const itemSnapshots = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error("Product not found: " + item.productId);
    const productName = product.product?.name || product.name || "Unknown Product";
    if (product.stockQuantity < item.qty) {
      throw new Error(`Insufficient stock for ${productName}. Available: ${product.stockQuantity}`);
    }

    let itemPrice = product.price;
    if (product.priceOnRequest && product.vendor?.vendorProfile?.isSystemVendor) {
      const unlockedPrice = unlockMap.get(product.id);
      if (!unlockedPrice) throw new Error(`Price not unlocked for "${productName}".`);
      itemPrice = unlockedPrice;
    }

    totalAmount += itemPrice * item.qty;
    return { productId: item.productId, qty: item.qty, priceSnapshot: itemPrice, name: productName };
  });

  // 5. Verify with Razorpay that this exact order was actually paid this
  // exact amount - signature alone doesn't prove that (see verifyRazorpayPayment).
  const verification = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, totalAmount);
  if (!verification.valid) {
    return NextResponse.json({ ok: false, error: verification.reason || "Payment verification failed" }, { status: 400 });
  }

  // 6. Transaction: Create payment (VERIFIED) + order + stock + ledger + expense + clear cart
  const ownerId = await getRestaurantOwnerId(restaurantId);

  const order = await db.$transaction(async (tx) => {
    // Decrement stock
    for (const item of itemSnapshots) {
      await tx.vendorProduct.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.qty } },
      });
    }

    // Create order
    const newOrder = await tx.marketplaceOrder.create({
      data: {
        ownerId,
        vendorId,
        restaurantId,
        status: "CONFIRMED",
        totalAmount,
        deliveryAddress: deliveryAddress || null,
        notes: notes || null,
        items: {
          create: itemSnapshots.map((item) => ({
            vendorProductId: item.productId,
            qty: item.qty,
            priceSnapshot: item.priceSnapshot,
          })),
        },
      },
      include: { items: true },
    });

    // Create payment record (already verified via Razorpay)
    await tx.marketplacePayment.create({
      data: {
        ownerId,
        vendorId,
        restaurantId,
        totalAmount,
        items: itemSnapshots,
        deliveryAddress: deliveryAddress || null,
        notes: notes || null,
        screenshotUrl: null,
        status: "VERIFIED",
        paymentMethod: "RAZORPAY",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        verifiedAt: new Date(),
        orderId: newOrder.id,
      },
    });

    // Ledger entry
    const vendor = await tx.user.findUnique({
      where: { id: vendorId },
      select: { name: true, phone: true },
    });

    const previousEntries = await tx.vendorLedger.findMany({
      where: {
        restaurantId,
        ownerId,
        vendorName: vendor?.name || "KNI Official Store",
      },
      orderBy: { entryDate: "desc" },
      take: 1,
    });

    const previousBalance = previousEntries[0]?.balanceAfter || 0;

    await tx.vendorLedger.create({
      data: {
        ownerId,
        restaurantId,
        vendorName: vendor?.name || "KNI Official Store",
        vendorPhone: vendor?.phone || null,
        entryType: "PURCHASE",
        amount: totalAmount,
        description: `Marketplace order (Razorpay) - ${itemSnapshots.length} items`,
        billNumber: `MKT-${newOrder.id.substring(0, 8)}`,
        billDate: new Date(),
        balanceAfter: previousBalance + totalAmount,
        entryDate: new Date(),
        createdBy: ownerId,
      },
    });

    // Expense entry
    await tx.expense.create({
      data: {
        ownerId,
        restaurantId,
        category: "SUPPLIES",
        amount: totalAmount,
        expenseDate: new Date(),
        description: `Marketplace order (Razorpay) - ${itemSnapshots.length} items from ${vendor?.name || "KNI Official Store"}`,
      },
    });

    // Clear cart for this vendor
    const cart = await tx.marketplaceCart.findUnique({
      where: { ownerId_restaurantId: { ownerId, restaurantId } },
    });
    if (cart) {
      await tx.marketplaceCartItem.deleteMany({
        where: { cartId: cart.id, product: { vendorId } },
      });
    }

    return newOrder;
  });

  // Notifications
  createNotification({
    userId: ownerId,
    title: "Payment Successful!",
    message: `Your Razorpay payment of ₹${totalAmount.toLocaleString("en-IN")} is verified. Order #${order.id.substring(0, 8)} confirmed.`,
    type: "PAYMENT",
    linkUrl: "/owner/marketplace/orders",
  }).catch(console.error);

  // Notify admin
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    createNotification({
      userId: admin.id,
      title: "New Razorpay Order",
      message: `Order #${order.id.substring(0, 8)} - ₹${totalAmount.toLocaleString("en-IN")} paid via Razorpay.`,
      type: "PAYMENT",
      linkUrl: "/admin/my-store/orders",
    }).catch(console.error);
  }

  return NextResponse.json({
    ok: true,
    data: { orderId: order.id, paymentVerified: true },
  });
}

// ======================== MARKETPLACE INSTALLMENT (negotiated quotes) ========================
const marketplaceAdvanceSchema = z.object({
  type: z.literal("MARKETPLACE_INSTALLMENT"),
  installmentType: z.literal("ADVANCE"),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  priceUnlockRequestId: z.string().min(1),
  quantity: z.number().int().positive(),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  notes: z.string().optional(),
});

const marketplaceFinalSchema = z.object({
  type: z.literal("MARKETPLACE_INSTALLMENT"),
  installmentType: z.literal("FINAL"),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  marketplacePaymentId: z.string().min(1),
});

async function handleMarketplaceInstallmentPayment(session: any, body: any) {
  if (body.installmentType === "FINAL") {
    return handleMarketplaceFinalPayment(session, body);
  }
  return handleMarketplaceAdvancePayment(session, body);
}

async function handleMarketplaceAdvancePayment(session: any, body: any) {
  const validation = marketplaceAdvanceSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const {
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    priceUnlockRequestId, quantity, deliveryAddress, notes,
  } = validation.data;

  const existing = await db.marketplacePayment.findFirst({
    where: { razorpayPaymentId: razorpay_payment_id },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      data: { orderId: existing.orderId, paymentVerified: true },
    });
  }

  const priceUnlockRequest = await db.priceUnlockRequest.findUnique({
    where: { id: priceUnlockRequestId },
    include: {
      product: { include: { product: { select: { name: true } } } },
    },
  });

  if (
    !priceUnlockRequest ||
    priceUnlockRequest.ownerId !== session.id ||
    priceUnlockRequest.status !== "UNLOCKED" ||
    !priceUnlockRequest.unlockedPrice
  ) {
    return NextResponse.json({ ok: false, error: "No unlocked price found for this request" }, { status: 400 });
  }
  if (priceUnlockRequest.validUntil && priceUnlockRequest.validUntil < new Date()) {
    return NextResponse.json({ ok: false, error: "This price offer has expired" }, { status: 400 });
  }
  if (priceUnlockRequest.quantity != null && quantity > priceUnlockRequest.quantity) {
    return NextResponse.json(
      { ok: false, error: `This negotiated price is only valid for up to ${priceUnlockRequest.quantity} units` },
      { status: 400 }
    );
  }

  await requireRestaurantAccess(session, priceUnlockRequest.restaurantId, "marketplace:create");

  const vendorId = priceUnlockRequest.product.vendorId;
  const totalAmount = priceUnlockRequest.unlockedPrice * quantity;
  const advanceAmount = computeMarketplaceAdvance(totalAmount);

  const verification = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, advanceAmount);
  if (!verification.valid) {
    return NextResponse.json({ ok: false, error: verification.reason || "Payment verification failed" }, { status: 400 });
  }

  const ownerId = await getRestaurantOwnerId(priceUnlockRequest.restaurantId);

  let order;
  try {
    order = await db.$transaction(async (tx) => {
    const product = await tx.vendorProduct.findUnique({
      where: { id: priceUnlockRequest.vendorProductId },
      select: { stockQuantity: true },
    });
    if (!product || product.stockQuantity < quantity) {
      throw new Error(`Insufficient stock. Available: ${product?.stockQuantity ?? 0}, Requested: ${quantity}`);
    }
    await tx.vendorProduct.update({
      where: { id: priceUnlockRequest.vendorProductId },
      data: { stockQuantity: { decrement: quantity } },
    });

    const newOrder = await tx.marketplaceOrder.create({
      data: {
        ownerId,
        vendorId,
        restaurantId: priceUnlockRequest.restaurantId,
        status: "PLACED",
        totalAmount,
        deliveryAddress: deliveryAddress || null,
        notes: notes || null,
        items: {
          create: [{
            vendorProductId: priceUnlockRequest.vendorProductId,
            qty: quantity,
            priceSnapshot: priceUnlockRequest.unlockedPrice!,
          }],
        },
      },
    });

    await tx.marketplacePayment.create({
      data: {
        ownerId,
        vendorId,
        restaurantId: priceUnlockRequest.restaurantId,
        totalAmount: advanceAmount,
        items: [{
          productId: priceUnlockRequest.vendorProductId,
          qty: quantity,
          priceSnapshot: priceUnlockRequest.unlockedPrice,
          name: priceUnlockRequest.product.product?.name || "Unknown Product",
        }],
        deliveryAddress: deliveryAddress || null,
        notes: notes || null,
        screenshotUrl: null,
        status: "VERIFIED",
        paymentMethod: "RAZORPAY",
        installmentType: "ADVANCE",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        verifiedAt: new Date(),
        orderId: newOrder.id,
      },
    });

    // Only the advance has actually been collected right now - book that,
    // not the full order value, so ledger/expense reflect real cash flow.
    // The remaining 70% is booked separately when the final payment clears
    // (see handleMarketplaceFinalPayment below).
    const vendor = await tx.user.findUnique({ where: { id: vendorId }, select: { name: true, phone: true } });
    const previousEntries = await tx.vendorLedger.findMany({
      where: { restaurantId: priceUnlockRequest.restaurantId, ownerId, vendorName: vendor?.name || "KNI Official Store" },
      orderBy: { entryDate: "desc" },
      take: 1,
    });
    const previousBalance = previousEntries[0]?.balanceAfter || 0;

    await tx.vendorLedger.create({
      data: {
        ownerId,
        restaurantId: priceUnlockRequest.restaurantId,
        vendorName: vendor?.name || "KNI Official Store",
        vendorPhone: vendor?.phone || null,
        entryType: "PURCHASE",
        amount: advanceAmount,
        description: `Marketplace order (negotiated, 30% advance) - ${priceUnlockRequest.product.product?.name || "product"}`,
        billNumber: `MKT-${newOrder.id.substring(0, 8)}-ADV`,
        billDate: new Date(),
        balanceAfter: previousBalance + advanceAmount,
        entryDate: new Date(),
        createdBy: ownerId,
      },
    });

    await tx.expense.create({
      data: {
        ownerId,
        restaurantId: priceUnlockRequest.restaurantId,
        category: "SUPPLIES",
        amount: advanceAmount,
        expenseDate: new Date(),
        description: `Marketplace order (negotiated, 30% advance) - ${priceUnlockRequest.product.product?.name || "product"} from ${vendor?.name || "KNI Official Store"}`,
      },
    });

    return newOrder;
    });
  } catch (error) {
    // The Razorpay charge already succeeded before this transaction ran
    // (that's the whole point of "advance payment") - if order creation
    // fails (e.g. a stock race), the owner must not be left having paid for
    // nothing. Refund automatically rather than leaving a stranded charge.
    let refundIssued = false;
    try {
      await refundRazorpayPayment(razorpay_payment_id, advanceAmount, {
        reason: "order_creation_failed",
        priceUnlockRequestId,
      });
      refundIssued = true;
    } catch (refundError) {
      console.error("Marketplace advance refund failed:", refundError);
    }

    const failureMessage = error instanceof Error ? error.message : "Failed to create order";
    createNotification({
      userId: ownerId,
      title: refundIssued ? "Order Failed - Refund Issued" : "Order Failed - Refund Pending",
      message: refundIssued
        ? `Your order could not be placed (${failureMessage}). Your advance of ₹${advanceAmount.toLocaleString("en-IN")} has been refunded.`
        : `Your order could not be placed (${failureMessage}). We're processing a refund of ₹${advanceAmount.toLocaleString("en-IN")} - contact support if not reflected within a few days.`,
      type: "PAYMENT",
      linkUrl: "/owner/marketplace",
    }).catch(console.error);

    return NextResponse.json(
      {
        ok: false,
        error: refundIssued
          ? `${failureMessage}. Your advance payment has been refunded.`
          : `${failureMessage}. A refund is being processed.`,
      },
      { status: 400 }
    );
  }

  createNotification({
    userId: ownerId,
    title: "Advance Payment Successful!",
    message: `Your advance of ₹${advanceAmount.toLocaleString("en-IN")} is verified. Order #${order.id.substring(0, 8)} confirmed. Remaining ₹${(totalAmount - advanceAmount).toLocaleString("en-IN")} will be due on delivery.`,
    type: "PAYMENT",
    linkUrl: "/owner/marketplace/orders",
  }).catch(console.error);

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    createNotification({
      userId: admin.id,
      title: "New Negotiated Order (Advance Paid)",
      message: `Order #${order.id.substring(0, 8)} - ₹${advanceAmount.toLocaleString("en-IN")} advance paid via Razorpay.`,
      type: "PAYMENT",
      linkUrl: "/admin/my-store/orders",
    }).catch(console.error);
  }

  return NextResponse.json({
    ok: true,
    data: { orderId: order.id, paymentVerified: true },
  });
}

async function handleMarketplaceFinalPayment(session: any, body: any) {
  const validation = marketplaceFinalSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, marketplacePaymentId } = validation.data;

  const payment = await db.marketplacePayment.findUnique({
    where: { id: marketplacePaymentId },
  });

  if (!payment) {
    return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
  }
  if (payment.installmentType !== "FINAL" || payment.status !== "PENDING") {
    return NextResponse.json({ ok: false, error: "Payment already processed or not due" }, { status: 400 });
  }

  const verification = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, payment.totalAmount);
  if (!verification.valid) {
    return NextResponse.json({ ok: false, error: verification.reason || "Payment verification failed" }, { status: 400 });
  }

  await requireRestaurantAccess(session, payment.restaurantId, "marketplace:create");

  const order = await db.marketplaceOrder.findUnique({
    where: { id: payment.orderId! },
    include: { items: { include: { product: { include: { product: { select: { name: true } } } } } } },
  });
  const vendor = await db.user.findUnique({ where: { id: payment.vendorId }, select: { name: true, phone: true } });
  const productNames = order?.items.map((i) => i.product.product?.name).filter(Boolean).join(", ") || "product";

  await db.$transaction(async (tx) => {
    await tx.marketplacePayment.update({
      where: { id: marketplacePaymentId },
      data: {
        status: "VERIFIED",
        paymentMethod: "RAZORPAY",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        verifiedAt: new Date(),
      },
    });

    // Completes the accrual started at advance time (see
    // handleMarketplaceAdvancePayment) - books the remaining balance now
    // that it's actually been collected.
    const previousEntries = await tx.vendorLedger.findMany({
      where: { restaurantId: payment.restaurantId, ownerId: payment.ownerId, vendorName: vendor?.name || "KNI Official Store" },
      orderBy: { entryDate: "desc" },
      take: 1,
    });
    const previousBalance = previousEntries[0]?.balanceAfter || 0;

    await tx.vendorLedger.create({
      data: {
        ownerId: payment.ownerId,
        restaurantId: payment.restaurantId,
        vendorName: vendor?.name || "KNI Official Store",
        vendorPhone: vendor?.phone || null,
        entryType: "PURCHASE",
        amount: payment.totalAmount,
        description: `Marketplace order (negotiated, final 70%) - ${productNames}`,
        billNumber: `MKT-${payment.orderId?.substring(0, 8)}-FIN`,
        billDate: new Date(),
        balanceAfter: previousBalance + payment.totalAmount,
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
        description: `Marketplace order (negotiated, final 70%) - ${productNames} from ${vendor?.name || "KNI Official Store"}`,
      },
    });
  });

  createNotification({
    userId: payment.ownerId,
    title: "Final Payment Successful!",
    message: `Your final payment of ₹${payment.totalAmount.toLocaleString("en-IN")} is verified. Order fully paid.`,
    type: "PAYMENT",
    linkUrl: "/owner/marketplace/orders",
  }).catch(console.error);

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    createNotification({
      userId: admin.id,
      title: "Final Payment Received",
      message: `Final payment of ₹${payment.totalAmount.toLocaleString("en-IN")} received via Razorpay for order ${payment.orderId?.substring(0, 8) || ""}.`,
      type: "PAYMENT",
      linkUrl: "/admin/my-store/orders",
    }).catch(console.error);
  }

  return NextResponse.json({
    ok: true,
    data: { marketplacePaymentId, orderId: payment.orderId, paymentVerified: true },
  });
}

// ======================== SERVICE BOOKING ========================
async function handleServiceBookingPayment(session: any, body: any) {
  const validation = serviceBookingSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = validation.data;

  // 1. Check for duplicate payment by razorpayPaymentId (prevent replay)
  const existingByPaymentId = await db.paymentProof.findFirst({
    where: { razorpayPaymentId: razorpay_payment_id },
  });
  if (existingByPaymentId) {
    return NextResponse.json({
      ok: true,
      data: { bookingId: existingByPaymentId.bookingId, paymentVerified: true, message: "Payment already recorded" },
    });
  }

  // 2. Find booking
  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    include: { restaurant: { select: { name: true } } },
  });

  if (!booking) {
    return NextResponse.json(
      { ok: false, error: "Booking not found" },
      { status: 404 }
    );
  }

  // 3. RBAC check
  await requireRestaurantAccess(session, booking.restaurantId, "bookings:update");

  // A rejected manual payment proof can be retried via Razorpay - the booking
  // is still payable in that state, not just at the initial SLOT_SELECTED step.
  if (booking.status !== "SLOT_SELECTED" && booking.status !== "PAYMENT_REJECTED") {
    return NextResponse.json(
      { ok: false, error: "Cannot process payment for this booking status" },
      { status: 400 }
    );
  }

  // 3b. Verify with Razorpay that this order was actually paid the booking's total.
  const verification = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, booking.totalAmount);
  if (!verification.valid) {
    return NextResponse.json({ ok: false, error: verification.reason || "Payment verification failed" }, { status: 400 });
  }

  // 4. Check for duplicate payment (prevent double pay). bookingId is unique on
  // PaymentProof, so a rejected manual proof already occupies this row - only
  // short-circuit here if it was actually verified already.
  const existingPayment = await db.paymentProof.findUnique({
    where: { bookingId },
  });
  if (existingPayment?.status === "VERIFIED") {
    return NextResponse.json({
      ok: true,
      data: { bookingId, paymentVerified: true, message: "Payment already recorded" },
    });
  }

  // 5. Get actual owner ID
  const actualOwnerId = await getRestaurantOwnerId(booking.restaurantId);

  // 6. Upsert PaymentProof as VERIFIED + update booking status. Upsert (not
  // create) because a rejected manual proof may already own this bookingId row.
  await db.$transaction(async (tx) => {
    await tx.paymentProof.upsert({
      where: { bookingId },
      create: {
        bookingId,
        ownerId: actualOwnerId,
        screenshotUrl: null,
        status: "VERIFIED",
        paymentMethod: "RAZORPAY",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        verifiedAt: new Date(),
      },
      update: {
        status: "VERIFIED",
        paymentMethod: "RAZORPAY",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        rejectionReason: null,
        verifiedAt: new Date(),
      },
    });

    await tx.serviceBooking.update({
      where: { id: bookingId },
      data: { status: "PAYMENT_VERIFIED" },
    });
  });

  // 7. Notify
  // totalAmount already includes GST + tip from booking creation
  const totalAmount = booking.totalAmount || 0;

  createNotification({
    userId: actualOwnerId,
    title: "Payment Successful!",
    message: `Your Razorpay payment of ₹${totalAmount.toLocaleString("en-IN")} for service booking is verified.`,
    type: "PAYMENT",
    linkUrl: `/owner/bookings/${bookingId}`,
  }).catch(console.error);

  // Notify admins
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    createNotification({
      userId: admin.id,
      title: "New Razorpay Booking Payment",
      message: `Service booking #${bookingId.substring(0, 8)} - ₹${totalAmount.toLocaleString("en-IN")} paid via Razorpay. Ready for engineer assignment.`,
      type: "PAYMENT",
      linkUrl: `/admin/bookings/${bookingId}`,
    }).catch(console.error);
  }

  return NextResponse.json({
    ok: true,
    data: { bookingId, paymentVerified: true },
  });
}

// ======================== AMC PAYMENT ========================
const amcPaymentSchema = z.object({
  type: z.literal("AMC_PAYMENT"),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  amcPaymentId: z.string().min(1),
});

async function handleAMCPayment(session: any, body: any) {
  const validation = amcPaymentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amcPaymentId } = validation.data;

  // 1. Find AMC payment
  const amcPayment = await db.aMCPayment.findUnique({
    where: { id: amcPaymentId },
    include: {
      request: { include: { restaurant: { select: { id: true, name: true } } } },
    },
  });

  if (!amcPayment) {
    return NextResponse.json({ ok: false, error: "AMC Payment not found" }, { status: 404 });
  }

  if (amcPayment.status !== "PENDING" && amcPayment.status !== "REJECTED") {
    return NextResponse.json(
      { ok: false, error: "Payment already processed" },
      { status: 400 }
    );
  }

  // 2. Verify with Razorpay that this order was actually paid this amount
  const verification = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, amcPayment.amount);
  if (!verification.valid) {
    return NextResponse.json({ ok: false, error: verification.reason || "Payment verification failed" }, { status: 400 });
  }

  // 3. RBAC check
  await requireRestaurantAccess(session, amcPayment.request.restaurantId, "amc:update");

  // 4. Activate the contract (creates AMCContract + scheduled visits, marks
  // payment VERIFIED, updates request status, sends notifications/email)
  await activateAMCContract(amcPaymentId, {
    paymentMethod: "RAZORPAY",
    razorpay: {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    },
  });

  // 5. Notify admins of the Razorpay payment (owner + team already notified
  // by activateAMCContract)
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    createNotification({
      userId: admin.id,
      title: "AMC Razorpay Payment Received",
      message: `AMC payment of ₹${amcPayment.amount.toLocaleString("en-IN")} for "${amcPayment.request.restaurant.name}" verified via Razorpay.`,
      type: "AMC",
      linkUrl: `/admin/amc-requests`,
    }).catch(console.error);
  }

  return NextResponse.json({
    ok: true,
    data: { amcPaymentId, paymentVerified: true },
  });
}

// ======================== VENDOR COMMISSION ========================
const vendorCommissionSchema = z.object({
  type: z.literal("VENDOR_COMMISSION"),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  collectionId: z.string().min(1),
});

async function handleVendorCommission(session: any, body: any) {
  const validation = vendorCommissionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ ok: false, error: validation.error.issues[0].message }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, collectionId } = validation.data;

  const collection = await db.vendorCommissionCollection.findUnique({ where: { id: collectionId } });
  if (!collection) {
    return NextResponse.json({ ok: false, error: "Collection not found" }, { status: 404 });
  }
  if (collection.vendorId !== session.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }
  if (collection.status !== "REQUESTED" && collection.status !== "PAYMENT_REJECTED") {
    return NextResponse.json({ ok: false, error: "Payment already processed" }, { status: 400 });
  }

  const verification = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, collection.totalAmount);
  if (!verification.valid) {
    return NextResponse.json({ ok: false, error: verification.reason || "Payment verification failed" }, { status: 400 });
  }

  await db.vendorCommissionCollection.update({
    where: { id: collectionId },
    data: {
      status: "VERIFIED",
      paymentMethod: "RAZORPAY",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      verifiedAt: new Date(),
    },
  });

  createNotification({
    userId: session.id,
    title: "Commission Payment Successful!",
    message: `Your Razorpay payment of ₹${collection.totalAmount.toLocaleString("en-IN")} for commission is verified.`,
    type: "PAYMENT",
    linkUrl: "/vendor/commission",
  }).catch(console.error);

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    createNotification({
      userId: admin.id,
      title: "Vendor Commission Paid (Razorpay)",
      message: `Commission of ₹${collection.totalAmount.toLocaleString("en-IN")} paid via Razorpay.`,
      type: "PAYMENT",
      linkUrl: "/admin/vendor-commissions",
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true, data: { collectionId, paymentVerified: true } });
}

// ======================== VENDOR SUBSCRIPTION ========================
const vendorSubscriptionSchema = z.object({
  type: z.literal("VENDOR_SUBSCRIPTION"),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  subscriptionRequestId: z.string().min(1),
});

async function handleVendorSubscription(session: any, body: any) {
  const validation = vendorSubscriptionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ ok: false, error: validation.error.issues[0].message }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionRequestId } = validation.data;

  const subRequest = await db.vendorSubscriptionRequest.findUnique({ where: { id: subscriptionRequestId } });
  if (!subRequest) {
    return NextResponse.json({ ok: false, error: "Subscription request not found" }, { status: 404 });
  }
  if (subRequest.vendorId !== session.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }
  if (subRequest.status !== "PRICE_SENT" && subRequest.status !== "PAYMENT_REJECTED") {
    return NextResponse.json({ ok: false, error: "Payment not applicable for this status" }, { status: 400 });
  }
  if (!subRequest.price) {
    return NextResponse.json({ ok: false, error: "No price set for this subscription request" }, { status: 400 });
  }

  const verification = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, subRequest.price);
  if (!verification.valid) {
    return NextResponse.json({ ok: false, error: verification.reason || "Payment verification failed" }, { status: 400 });
  }

  // Calculate activeUntil
  const now = new Date();
  const activeUntil = new Date(now);
  activeUntil.setMonth(activeUntil.getMonth() + subRequest.durationMonths);

  await db.$transaction([
    db.vendorSubscriptionRequest.update({
      where: { id: subscriptionRequestId },
      data: {
        status: "ACTIVATED",
        paymentMethod: "RAZORPAY",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        verifiedAt: new Date(),
        activatedAt: now,
        activeUntil,
      },
    }),
    db.vendorProfile.update({
      where: { userId: session.id },
      data: {
        subscriptionStatus: "ACTIVE",
        activeUntil,
      },
    }),
  ]);

  createNotification({
    userId: session.id,
    title: "Subscription Activated!",
    message: `Your ${subRequest.durationMonths}-month subscription is now active via Razorpay.`,
    type: "PAYMENT",
    linkUrl: "/vendor/subscription",
  }).catch(console.error);

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    createNotification({
      userId: admin.id,
      title: "Vendor Subscription Paid (Razorpay)",
      message: `Subscription of ₹${(subRequest.price || 0).toLocaleString("en-IN")} paid via Razorpay. Auto-activated.`,
      type: "PAYMENT",
      linkUrl: "/admin/vendor-subscriptions",
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true, data: { subscriptionRequestId, paymentVerified: true } });
}
