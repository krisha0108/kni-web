import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getEffectiveDiscount } from "@/server/pricing/discount";
import { computeCategorySubtotals } from "@/lib/booking-pricing";
import { z } from "zod";

const addItemSchema = z.object({
  itemType: z.enum(["SERVICE", "PART"]),
  serviceItemId: z.string().optional(),
  partItemId: z.string().optional(),
  qty: z.number().int().positive(),
  restaurantId: z.string().optional(),
});

/**
 * Resolves which restaurant a cart operation applies to. Prefers the
 * caller-supplied restaurantId (validated to belong to this owner and be
 * approved) so an owner with multiple restaurants doesn't silently have
 * their cart/discount operate on the wrong one. Falls back to "first
 * approved restaurant" only for legacy callers that don't pass one yet.
 */
async function resolveOwnerRestaurant(ownerId: string, requestedRestaurantId?: string | null) {
  if (requestedRestaurantId) {
    return db.restaurant.findFirst({
      where: { id: requestedRestaurantId, ownerId, status: "APPROVED" },
    });
  }
  return db.restaurant.findFirst({ where: { ownerId, status: "APPROVED" } });
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const requestedRestaurantId = request.nextUrl.searchParams.get("restaurantId");
    const restaurant = await resolveOwnerRestaurant(session.id, requestedRestaurantId);

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

    const totalAmount = cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.qty, 0);
    const categorySubtotals = computeCategorySubtotals(
      cart.items.map((item) => ({
        categoryId: (item.serviceItem?.category.id || item.partItem?.category.id)!,
        amount: item.priceSnapshot * item.qty,
      }))
    );

    const { percent: discountPercent, amount: discountAmount, source: discountSource, promoCodeError, promoCodeOutbidBy } = await getEffectiveDiscount({
      ownerId: session.id,
      restaurantId: restaurant.id,
      totalAmount,
      categorySubtotals,
      promoCode: cart.promoCode || undefined,
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...cart,
        discountPercent,
        discountAmount,
        discountSource: discountAmount > 0 ? discountSource : null,
        promoCodeError: promoCodeError || null,
        promoCodeOutbidBy: promoCodeOutbidBy || null,
      },
    });
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

    const { itemType, serviceItemId, partItemId, qty, restaurantId } = validation.data;

    const restaurant = await resolveOwnerRestaurant(session.id, restaurantId);

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
    const requestedRestaurantId = searchParams.get("restaurantId");

    // Clear all cart items
    if (clearAll === "true") {
      const restaurant = await resolveOwnerRestaurant(session.id, requestedRestaurantId);

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
