import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerWithApprovedRestaurant } from "@/server/auth/rbac";
import { z } from "zod";

const createOrderSchema = z.object({
  vendorId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      qty: z.number().int().positive(),
    })
  ),
});

export async function GET() {
  try {
    const session = await requireOwnerWithApprovedRestaurant();

    const orders = await db.marketplaceOrder.findMany({
      where: { ownerId: session.id },
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
    const session = await requireOwnerWithApprovedRestaurant();

    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { vendorId, items } = validation.data;

    const restaurant = await db.restaurant.findFirst({
      where: { ownerId: session.id, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "No approved restaurant" },
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
        restaurantId: restaurant.id,
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
