import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getMobileSession } from "@/server/auth/mobile-session";
import { z } from "zod";

const addItemSchema = z.object({
  restaurantId: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
});

/**
 * GET /api/owner/marketplace/cart
 * Get marketplace cart items (stored in MarketplaceCartItem table if exists,
 * or use in-memory approach with AsyncStorage on client)
 * For simplicity, we'll return empty cart and let client use AsyncStorage
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Since there's no MarketplaceCart model in the schema,
    // we'll return an empty response and let the client handle cart via AsyncStorage
    return NextResponse.json({
      ok: true,
      data: {
        items: [],
        message: "Use local storage for marketplace cart"
      }
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
 * Add item to marketplace cart
 * Since no cart table exists, this validates the product and returns success
 * The actual cart is managed on the client side via AsyncStorage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = addItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, productId, quantity } = validation.data;

    // Verify restaurant belongs to owner
    const restaurant = await db.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: session.id,
        status: "APPROVED",
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 400 }
      );
    }

    // Verify product exists and is available
    const vendorProduct = await db.vendorProduct.findUnique({
      where: { id: productId },
      include: {
        product: true,
        vendor: {
          select: { id: true, name: true }
        }
      }
    });

    if (!vendorProduct) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    if (!vendorProduct.isActive) {
      return NextResponse.json(
        { ok: false, error: "Product is no longer available" },
        { status: 400 }
      );
    }

    // Check stock - warn if low but still allow adding
    if (vendorProduct.stockQuantity < quantity) {
      if (vendorProduct.stockQuantity === 0) {
        return NextResponse.json(
          { ok: false, error: "Product is out of stock" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: false, error: `Only ${vendorProduct.stockQuantity} items available in stock` },
        { status: 400 }
      );
    }

    // Return product details for client to store in AsyncStorage
    return NextResponse.json({
      ok: true,
      data: {
        productId: vendorProduct.id,
        name: vendorProduct.product?.name || vendorProduct.name,
        price: vendorProduct.price,
        quantity,
        vendorId: vendorProduct.vendorId,
        vendorName: vendorProduct.vendor.name,
        imageUrl: vendorProduct.product?.imageUrl || vendorProduct.imageUrl,
        stockQuantity: vendorProduct.stockQuantity,
      }
    });
  } catch (error: any) {
    console.error("Add to marketplace cart error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
