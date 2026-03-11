import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getMobileSession } from "@/server/auth/mobile-session";
import { z } from "zod";

const cartDb = db as any;

const updateQuantitySchema = z.object({
  quantity: z.number().int().positive("Quantity must be positive"),
});

/**
 * PATCH /api/owner/marketplace/cart/items/[itemId]
 * Update cart item quantity
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getMobileSession(request);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { itemId } = await params;
    console.log(`[PATCH Cart Item] itemId: ${itemId}, userId: ${session.id}`);
    
    const body = await request.json();
    const validation = updateQuantitySchema.safeParse(body);

    if (!validation.success) {
      console.error(`[PATCH Cart Item] Validation error:`, validation.error.issues);
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { quantity } = validation.data;

    // Find cart item and verify ownership
    const cartItem = await cartDb.marketplaceCartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: true,
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { ok: false, error: "Cart item not found" },
        { status: 404 }
      );
    }

    if (cartItem.cart.ownerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized access to cart item" },
        { status: 403 }
      );
    }

    // Validate stock
    if (cartItem.product.stockQuantity < quantity) {
      return NextResponse.json(
        {
          ok: false,
          error: `Only ${cartItem.product.stockQuantity} items available in stock`,
        },
        { status: 400 }
      );
    }

    // Update quantity
    await cartDb.marketplaceCartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    // Fetch updated cart - simplified query
    const updatedCart = await cartDb.marketplaceCart.findUnique({
      where: { id: cartItem.cartId },
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

    if (!updatedCart) {
      return NextResponse.json(
        { ok: false, error: "Cart not found" },
        { status: 404 }
      );
    }

    const formattedItems: any[] = [];
    for (const item of updatedCart.items as any[]) {
      if (!item.product || !item.product.isActive) continue;
      formattedItems.push({
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.product?.name || item.product.name || "Unknown",
          price: item.product.price,
          stockQuantity: item.product.stockQuantity,
          imageUrl: item.product.product?.imageUrl || item.product.imageUrl,
          unit: item.product.product?.unit || item.product.unit,
          deliveryTime: item.product.deliveryTime,
          vendor: item.product.vendor,
          category: item.product.product?.marketplaceCategory || null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: { items: formattedItems },
    });
  } catch (error: any) {
    console.error("Update cart item quantity error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/owner/marketplace/cart/items/[itemId]
 * Remove single item from cart
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getMobileSession(request);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { itemId } = await params;

    // Find cart item and verify ownership
    const cartItem = await cartDb.marketplaceCartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { ok: false, error: "Cart item not found" },
        { status: 404 }
      );
    }

    if (cartItem.cart.ownerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized access to cart item" },
        { status: 403 }
      );
    }

    // Delete item
    await cartDb.marketplaceCartItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({
      ok: true,
      data: { message: "Cart item removed successfully" },
    });
  } catch (error: any) {
    console.error("Delete cart item error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
