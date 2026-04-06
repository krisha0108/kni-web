import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRoleMobile } from "@/server/auth/rbac";
import { Role } from "@prisma/client";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { createNotification } from "@/server/notifications/service";
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
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Payment verification failed" },
      { status: 500 }
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

  // 1. Verify Razorpay signature
  const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid payment signature. Payment verification failed." },
      { status: 400 }
    );
  }

  // 1b. Check for duplicate payment (prevent double pay)
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

  // 5. Transaction: Create payment (VERIFIED) + order + stock + ledger + expense + clear cart
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

  // 1. Verify signature
  const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid payment signature. Payment verification failed." },
      { status: 400 }
    );
  }

  // 1b. Check for duplicate payment by razorpayPaymentId (prevent replay)
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

  if (booking.status !== "SLOT_SELECTED") {
    return NextResponse.json(
      { ok: false, error: "Cannot process payment for this booking status" },
      { status: 400 }
    );
  }

  // 4. Check for duplicate payment (prevent double pay)
  const existingPayment = await db.paymentProof.findUnique({
    where: { bookingId },
  });
  if (existingPayment) {
    return NextResponse.json({
      ok: true,
      data: { bookingId, paymentVerified: true, message: "Payment already recorded" },
    });
  }

  // 5. Get actual owner ID
  const actualOwnerId = await getRestaurantOwnerId(booking.restaurantId);

  // 6. Create PaymentProof as VERIFIED + update booking status
  await db.$transaction(async (tx) => {
    await tx.paymentProof.create({
      data: {
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

  // 1. Verify signature
  const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid payment signature. Payment verification failed." },
      { status: 400 }
    );
  }

  // 2. Find AMC payment
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

  // 3. RBAC check
  await requireRestaurantAccess(session, amcPayment.request.restaurantId, "amc:update");

  // 4. Update payment as verified + update request status
  await db.$transaction([
    db.aMCPayment.update({
      where: { id: amcPaymentId },
      data: {
        status: "VERIFIED",
        paymentMethod: "RAZORPAY",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        verifiedAt: new Date(),
      },
    }),
    db.aMCRequest.update({
      where: { id: amcPayment.requestId },
      data: { status: "CONTRACT_ACTIVE" },
    }),
  ]);

  // 5. Notify
  createNotification({
    userId: amcPayment.ownerId,
    title: "AMC Payment Successful!",
    message: `Your Razorpay payment of ₹${amcPayment.amount.toLocaleString("en-IN")} for AMC is verified. Contract is now active.`,
    type: "AMC",
    linkUrl: `/owner/amc-requests/${amcPayment.requestId}`,
  }).catch(console.error);

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

  const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    return NextResponse.json({ ok: false, error: "Invalid payment signature." }, { status: 400 });
  }

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

  const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    return NextResponse.json({ ok: false, error: "Invalid payment signature." }, { status: 400 });
  }

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
