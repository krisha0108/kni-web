import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { createNotification } from "@/server/notifications/service";
import { z } from "zod";

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
    const products = await db.vendorProduct.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalAmount = 0;

    const itemSnapshots = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Product not found: " + item.productId);
      if (product.stockQuantity < item.qty) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`);
      }
      totalAmount += product.price * item.qty;
      return {
        productId: item.productId,
        qty: item.qty,
        priceSnapshot: product.price,
        name: product.name,
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
      message: `Payment of ₹${(totalAmount / 100).toFixed(2)} from ${payment.owner.name} for ${payment.restaurant.name}. Please verify.`,
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
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const status = request.nextUrl.searchParams.get("status");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    await requireRestaurantAccess(session, restaurantId, "marketplace:read");

    const payments = await db.marketplacePayment.findMany({
      where: {
        restaurantId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: payments });
  } catch (error) {
    console.error("Get marketplace payments error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
