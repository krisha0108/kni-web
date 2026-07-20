import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { createNotification } from "@/server/notifications/service";
import { MarketplacePaymentStatus } from "@prisma/client";
import { z } from "zod";
import { resolveNegotiatedPrice } from "@/lib/marketplace-pricing";

const submitPaymentSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  vendorId: z.string().min(1, "Vendor ID is required"),
  items: z.array(
    z.object({
      productId: z.string(),
      qty: z.number().int().positive(),
    })
  ).min(1, "At least one item is required"),
  screenshotUrl: z.string().min(1, "Payment screenshot is required"),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const body = await request.json();
    const validation = submitPaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, vendorId, items, screenshotUrl, deliveryAddress, notes } = validation.data;

    // Check restaurant access
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

    // Check if vendor is system vendor — skip location check
    const vendorProfile = await db.vendorProfile.findUnique({
      where: { userId: vendorId },
      select: { isSystemVendor: true },
    });

    if (!vendorProfile?.isSystemVendor) {
      const vendorApprovedLocation = await db.vendorLocationRequest.findFirst({
        where: {
          vendorId,
          status: "APPROVED",
          area: { city: { name: restaurant.city } },
        },
      });

      if (!vendorApprovedLocation) {
        return NextResponse.json(
          { ok: false, error: "Vendor is not approved to serve in your restaurant's city" },
          { status: 400 }
        );
      }
    }

    // Validate products and calculate total
    // Include MarketplaceProduct relation to get actual product name (VendorProduct.name is legacy/null)
    const products = await db.vendorProduct.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      include: {
        product: { select: { name: true } },
        vendor: {
          select: { vendorProfile: { select: { isSystemVendor: true } } },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Fetch price unlocks for price-on-request products
    const priceOnRequestIds = products
      .filter((p) => p.priceOnRequest && p.vendor.vendorProfile?.isSystemVendor)
      .map((p) => p.id);

    let unlockMap = new Map<string, { unlockedPrice: number | null; validUntil: Date | null; quantity: number | null }>();
    if (priceOnRequestIds.length > 0) {
      const unlocks = await db.priceUnlockRequest.findMany({
        where: {
          ownerId: session.id,
          vendorProductId: { in: priceOnRequestIds },
          status: "UNLOCKED",
        },
        select: { vendorProductId: true, unlockedPrice: true, validUntil: true, quantity: true },
      });

      for (const u of unlocks) {
        unlockMap.set(u.vendorProductId, u);
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

      // Use unlocked price for price-on-request products
      let itemPrice = product.price;
      if (product.priceOnRequest && product.vendor.vendorProfile?.isSystemVendor) {
        const unlock = unlockMap.get(product.id);
        const resolved = resolveNegotiatedPrice(product, unlock ?? null);
        if (!resolved.isNegotiated) {
          throw new Error(
            resolved.expired
              ? `Your price quote for "${productName}" has expired. Please request a new price.`
              : `Price not unlocked for "${productName}". Please request a price first.`
          );
        }
        if (unlock?.quantity != null && item.qty > unlock.quantity) {
          throw new Error(`Your negotiated price for "${productName}" is only valid for up to ${unlock.quantity} units`);
        }
        itemPrice = resolved.price;
      }

      totalAmount += itemPrice * item.qty;
      return {
        productId: item.productId,
        qty: item.qty,
        priceSnapshot: itemPrice,
        name: productName,
      };
    });

    // Create payment (order will be created after vendor verifies)
    const ownerId = await getRestaurantOwnerId(restaurantId);
    const payment = await db.marketplacePayment.create({
      data: {
        ownerId,
        vendorId,
        restaurantId,
        totalAmount,
        items: itemSnapshots,
        deliveryAddress: deliveryAddress || null,
        notes: notes || null,
        screenshotUrl,
        status: "PENDING",
      },
      include: {
        owner: { select: { name: true } },
        restaurant: { select: { name: true } },
      },
    });

    // Notify vendor
    createNotification({
      userId: vendorId,
      title: "New Payment Received",
      message: `Payment of ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from ${payment.owner.name} for ${payment.restaurant.name}. Please verify.`,
      type: "PAYMENT",
      linkUrl: "/vendor/payments",
    }).catch(console.error);

    return NextResponse.json({ ok: true, data: payment });
  } catch (error) {
    console.error("Submit marketplace payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    await requireRestaurantAccess(session, restaurantId, "marketplace:read");

    const where = {
      restaurantId,
      ...(status ? { status: status as MarketplacePaymentStatus } : {}),
    };

    const [payments, total] = await Promise.all([
      db.marketplacePayment.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
        ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
    }),
      page > 0 ? db.marketplacePayment.count({ where }) : Promise.resolve(-1),
    ]);

    // Resolve product names for items with missing names (legacy data)
    // Collect all productIds that have null/empty name
    const allProductIds: string[] = [];
    for (const payment of payments) {
      const items = (payment.items as any[]) || [];
      for (const item of items) {
        if (!item.name && item.productId) {
          allProductIds.push(item.productId);
        }
      }
    }

    let productNameMap = new Map<string, string>();
    if (allProductIds.length > 0) {
      const vendorProducts = await db.vendorProduct.findMany({
        where: { id: { in: [...new Set(allProductIds)] } },
        select: { id: true, name: true, product: { select: { name: true } } },
      });
      for (const vp of vendorProducts) {
        productNameMap.set(vp.id, vp.product?.name || vp.name || "Unknown Product");
      }
    }

    // Backfill names in response
    const resolved = payments.map((payment) => ({
      ...payment,
      items: ((payment.items as any[]) || []).map((item: any) => ({
        ...item,
        name: item.name || productNameMap.get(item.productId) || "Unknown Product",
      })),
    }));

    return NextResponse.json({
      ok: true,
      data: page > 0 ? { items: resolved, total, page, pageSize } : resolved,
    });
  } catch (error) {
    console.error("Get marketplace payments error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
