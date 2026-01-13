import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { z } from "zod";

const createOrderSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  vendorId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      qty: z.number().int().positive(),
    })
  ),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with marketplace:read permission
    await requireRestaurantAccess(session, restaurantId, "marketplace:read");

    const orders = await db.marketplaceOrder.findMany({
      where: { restaurantId },
      include: {
        vendor: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: orders });
  } catch (error) {
    console.error("Get marketplace orders error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();

    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, vendorId, items } = validation.data;

    // Check restaurant access with marketplace:create permission
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

    const products = await db.vendorProduct.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalAmount = 0;

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Product not found: " + item.productId);
      totalAmount += product.price * item.qty;
      return {
        vendorProductId: item.productId,
        qty: item.qty,
        priceSnapshot: product.price,
      };
    });

    const order = await db.marketplaceOrder.create({
      data: {
        ownerId: session.id,
        vendorId,
        restaurantId,
        status: "PLACED",
        totalAmount,
        items: { create: orderItems },
      },
    });

    return NextResponse.json({ ok: true, data: order });
  } catch (error) {
    console.error("Create marketplace order error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
