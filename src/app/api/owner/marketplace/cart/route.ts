import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { z } from "zod";

const addItemSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  vendorProductId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int(),
});

/**
 * GET /api/owner/marketplace/cart?restaurantId=X
 * Fetch cart with full product details (always fresh)
 * Auto-removes stale items (inactive/deleted products)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    // Verify restaurant access (supports team members)
    await requireRestaurantAccess(session, restaurantId, "marketplace:read");

    // Find cart
    let cart = await db.marketplaceCart.findUnique({
      where: {
        ownerId_restaurantId: {
          ownerId: session.id,
          restaurantId,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                product: true,
                vendor: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      // Return empty cart if doesn't exist
      return NextResponse.json({
        ok: true,
        data: { items: [] },
      });
    }

    // Filter out stale items (inactive products) and collect IDs to delete
    const staleItemIds: string[] = [];
    const validItems = cart.items.filter((item) => {
      const product = item.product;
      if (!product || !product.isActive || !product.isAvailable) {
        staleItemIds.push(item.id);
        return false;
      }
      return true;
    });

    // Delete stale items from DB
    if (staleItemIds.length > 0) {
      await db.marketplaceCartItem.deleteMany({
        where: { id: { in: staleItemIds } },
      });
    }

    // Format response: cart items with full product details
    const formattedItems = validItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.product?.name || item.product.name || "Unknown",
        price: item.product.price,
        stockQuantity: item.product.stockQuantity,
        imageUrl: item.product.product?.imageUrl || item.product.imageUrl,
        unit: item.product.product?.unit || item.product.unit,
        vendor: item.product.vendor,
        category: null,
      },
    }));

    return NextResponse.json({
      ok: true,
      data: { items: formattedItems },
    });
  } catch (error: any) {
    console.error("Get marketplace cart error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/owner/marketplace/cart
 * Add/update item in cart. If quantity <= 0, removes item.
 */
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

    const { restaurantId, vendorProductId, quantity } = validation.data;

    // Verify restaurant access (supports team members)
    await requireRestaurantAccess(session, restaurantId, "marketplace:create");

    // Verify product exists and is available
    const vendorProduct = await db.vendorProduct.findUnique({
      where: { id: vendorProductId },
    });

    if (!vendorProduct || !vendorProduct.isActive) {
      return NextResponse.json(
        { ok: false, error: "Product not found or unavailable" },
        { status: 400 }
      );
    }

    // Stock validation
    if (quantity > 0 && vendorProduct.stockQuantity < quantity) {
      return NextResponse.json(
        {
          ok: false,
          error: `Only ${vendorProduct.stockQuantity} items available in stock`,
        },
        { status: 400 }
      );
    }

    // Find or create cart
    let cart = await db.marketplaceCart.upsert({
      where: {
        ownerId_restaurantId: {
          ownerId: session.id,
          restaurantId,
        },
      },
      create: {
        ownerId: session.id,
        restaurantId,
      },
      update: {},
    });

    // Upsert cart item or delete if quantity <= 0
    if (quantity <= 0) {
      await db.marketplaceCartItem.deleteMany({
        where: {
          cartId: cart.id,
          vendorProductId,
        },
      });
    } else {
      await db.marketplaceCartItem.upsert({
        where: {
          cartId_vendorProductId: {
            cartId: cart.id,
            vendorProductId,
          },
        },
        create: {
          cartId: cart.id,
          vendorProductId,
          quantity,
        },
        update: {
          quantity,
        },
      });
    }

    // Fetch updated cart
    const updatedCart = await db.marketplaceCart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                product: true,
                vendor: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const formattedItems = updatedCart!.items
      .filter((item) => item.product && item.product.isActive)
      .map((item) => ({
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.product?.name || item.product.name || "Unknown",
          price: item.product.price,
          stockQuantity: item.product.stockQuantity,
          imageUrl: item.product.product?.imageUrl || item.product.imageUrl,
          unit: item.product.product?.unit || item.product.unit,
          vendor: item.product.vendor,
          category: null,
        },
      }));

    return NextResponse.json({
      ok: true,
      data: { items: formattedItems },
    });
  } catch (error: any) {
    console.error("Add to marketplace cart error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/owner/marketplace/cart?restaurantId=X&vendorId=Y
 * Remove vendor's items after payment, or clear entire cart with ?clearAll=true
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const vendorId = request.nextUrl.searchParams.get("vendorId");
    const clearAll = request.nextUrl.searchParams.get("clearAll") === "true";

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    // Find cart
    const cart = await db.marketplaceCart.findUnique({
      where: {
        ownerId_restaurantId: {
          ownerId: session.id,
          restaurantId,
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ ok: true, data: { message: "Cart already empty" } });
    }

    if (clearAll) {
      // Delete all items
      await db.marketplaceCartItem.deleteMany({
        where: { cartId: cart.id },
      });
    } else if (vendorId) {
      // Delete only items from specific vendor
      await db.marketplaceCartItem.deleteMany({
        where: {
          cartId: cart.id,
          product: {
            vendorId,
          },
        },
      });
    } else {
      return NextResponse.json(
        { ok: false, error: "Either vendorId or clearAll must be specified" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: { message: "Cart items removed successfully" },
    });
  } catch (error: any) {
    console.error("Delete cart items error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
