import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { z } from "zod";

const addItemSchema = z.object({
  itemType: z.enum(["SERVICE", "PART"]),
  serviceItemId: z.string().optional(),
  partItemId: z.string().optional(),
  qty: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const restaurant = await db.restaurant.findFirst({
      where: { ownerId: session.id, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "No approved restaurant" },
        { status: 400 }
      );
    }

    const cartInclude = {
      items: {
        include: {
          serviceItem: {
            include: {
              category: true,
              subCategory: true,
            },
          },
          partItem: {
            include: {
              category: true,
              subCategory: true,
            },
          },
        },
      },
    };

    let cart = await db.cart.findFirst({
      where: { ownerId: session.id, restaurantId: restaurant.id, status: "DRAFT" },
      include: cartInclude,
    });

    if (!cart) {
      cart = await db.cart.create({
        data: {
          ownerId: session.id,
          restaurantId: restaurant.id,
          status: "DRAFT",
        },
        include: cartInclude,
      });
    }

    return NextResponse.json({ ok: true, data: cart });
  } catch (error) {
    console.error("Get cart error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const body = await request.json();
    const validation = addItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { itemType, serviceItemId, partItemId, qty } = validation.data;

    const restaurant = await db.restaurant.findFirst({
      where: { ownerId: session.id, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "No approved restaurant" },
        { status: 400 }
      );
    }

    let cart = await db.cart.findFirst({
      where: { ownerId: session.id, restaurantId: restaurant.id, status: "DRAFT" },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: { ownerId: session.id, restaurantId: restaurant.id, status: "DRAFT" },
      });
    }

    let priceSnapshot = 0;

    if (itemType === "SERVICE" && serviceItemId) {
      const service = await db.serviceItem.findUnique({ where: { id: serviceItemId } });
      if (!service) {
        return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
      }
      priceSnapshot = service.price;
    } else if (itemType === "PART" && partItemId) {
      const part = await db.partItem.findUnique({ where: { id: partItemId } });
      if (!part) {
        return NextResponse.json({ ok: false, error: "Part not found" }, { status: 404 });
      }
      priceSnapshot = part.price;
    }

    const existingItem = await db.cartItem.findFirst({
      where: {
        cartId: cart.id,
        itemType,
        serviceItemId: serviceItemId || null,
        partItemId: partItemId || null,
      },
    });

    if (existingItem) {
      await db.cartItem.update({
        where: { id: existingItem.id },
        data: { qty: existingItem.qty + qty },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          itemType,
          serviceItemId: serviceItemId || null,
          partItemId: partItemId || null,
          qty,
          priceSnapshot,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Add to cart error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get("itemId");
    const clearAll = searchParams.get("clearAll");

    // Clear all cart items
    if (clearAll === "true") {
      const restaurant = await db.restaurant.findFirst({
        where: { ownerId: session.id, status: "APPROVED" },
      });

      if (!restaurant) {
        return NextResponse.json({ ok: false, error: "No approved restaurant" }, { status: 400 });
      }

      const cart = await db.cart.findFirst({
        where: { ownerId: session.id, restaurantId: restaurant.id, status: "DRAFT" },
      });

      if (cart) {
        await db.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return NextResponse.json({ ok: true, message: "Cart cleared" });
    }

    // Delete single item
    if (!itemId) {
      return NextResponse.json({ ok: false, error: "Item ID required" }, { status: 400 });
    }

    const item = await db.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cart.ownerId !== session.id) {
      return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
    }

    await db.cartItem.delete({ where: { id: itemId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete cart item error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
