import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { z } from "zod";
import { resolveNegotiatedPrice } from "@/lib/marketplace-pricing";

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
                product: {
                  include: {
                    marketplaceCategory: { select: { id: true, name: true } },
                  },
                },
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

    // Fetch active price unlocks for price-on-request items in cart
    const cartProductIds = validItems.map((item) => item.product.id);
    const activeUnlocks = await db.priceUnlockRequest.findMany({
      where: {
        ownerId: session.id,
        vendorProductId: { in: cartProductIds },
        status: "UNLOCKED",
      },
      select: { vendorProductId: true, unlockedPrice: true, validUntil: true },
    });
    const unlockMap = new Map(activeUnlocks.map((u) => [u.vendorProductId, u]));

    // Format response: cart items with full product details
    const formattedItems = validItems.map((item) => {
      const unlock = unlockMap.get(item.product.id);
      const resolved = resolveNegotiatedPrice(item.product, unlock);
      const price = resolved.price;
      const priceExpired = resolved.expired;

      return {
        id: item.id,
        quantity: item.quantity,
        priceExpired,
        product: {
          id: item.product.id,
          name: item.product.product?.name || item.product.name || "Unknown",
          price,
          stockQuantity: item.product.stockQuantity,
          imageUrl: item.product.product?.imageUrl || item.product.imageUrl,
          unit: item.product.product?.unit || item.product.unit,
          deliveryTime: item.product.deliveryTime,
          vendor: item.product.vendor,
          category: (item.product as any).product?.marketplaceCategory || null,
        },
      };
    });

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
      include: {
        vendor: {
          select: { vendorProfile: { select: { isSystemVendor: true } } },
        },
      },
    });

    if (!vendorProduct || !vendorProduct.isActive) {
      return NextResponse.json(
        { ok: false, error: "Product not found or unavailable" },
        { status: 400 }
      );
    }

    // Block add-to-cart for price-on-request products without valid unlock
    if (vendorProduct.priceOnRequest && vendorProduct.vendor.vendorProfile?.isSystemVendor) {
      if (quantity > 0) {
        const unlock = await db.priceUnlockRequest.findUnique({
          where: {
            ownerId_restaurantId_vendorProductId: {
              ownerId: session.id,
              restaurantId,
              vendorProductId,
            },
          },
        });

        if (!unlock || unlock.status !== "UNLOCKED") {
          return NextResponse.json(
            { ok: false, error: "Please request a price for this product first" },
            { status: 400 }
          );
        }

        if (unlock.validUntil && unlock.validUntil < new Date()) {
          return NextResponse.json(
            { ok: false, error: "Your price quote has expired. Please request a new price." },
            { status: 400 }
          );
        }

        if (unlock.quantity != null && quantity > unlock.quantity) {
          return NextResponse.json(
            { ok: false, error: `This negotiated price is only valid for up to ${unlock.quantity} units` },
            { status: 400 }
          );
        }
      }
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
                product: {
                  include: {
                    marketplaceCategory: { select: { id: true, name: true } },
                  },
                },
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

    // Fetch unlocks for price-on-request items in updated cart
    const updatedProductIds = updatedCart!.items.map((item) => item.product.id);
    const updatedUnlocks = await db.priceUnlockRequest.findMany({
      where: {
        ownerId: session.id,
        vendorProductId: { in: updatedProductIds },
        status: "UNLOCKED",
      },
      select: { vendorProductId: true, unlockedPrice: true, validUntil: true },
    });
    const updatedUnlockMap = new Map(updatedUnlocks.map((u) => [u.vendorProductId, u]));

    const formattedItems = updatedCart!.items
      .filter((item) => item.product && item.product.isActive)
      .map((item) => {
        const unlock = updatedUnlockMap.get(item.product.id);
        const price = resolveNegotiatedPrice(item.product, unlock).price;
        return {
          id: item.id,
          quantity: item.quantity,
          product: {
            id: item.product.id,
            name: item.product.product?.name || item.product.name || "Unknown",
            price,
            stockQuantity: item.product.stockQuantity,
            imageUrl: item.product.product?.imageUrl || item.product.imageUrl,
            unit: item.product.product?.unit || item.product.unit,
            deliveryTime: item.product.deliveryTime,
            vendor: item.product.vendor,
            category: (item.product as any).product?.marketplaceCategory || null,
          },
        };
      });

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
