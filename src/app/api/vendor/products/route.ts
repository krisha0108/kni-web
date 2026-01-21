import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireApprovedVendor } from "@/server/auth/rbac";
import { z } from "zod";

// Schema for adding/updating vendor pricing for a product
const vendorProductSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  price: z.number().int().positive("Price must be a positive number"),
  description: z.string().optional(),
  stockQuantity: z.number().int().min(0).optional().default(0),
  deliveryTime: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

// GET /api/vendor/products - Get vendor's product listings with admin product info
export async function GET(request: NextRequest) {
  try {
    const session = await requireApprovedVendor();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";

    const where: any = {
      vendorId: session.id,
      deletedAt: null,
      productId: { not: null }, // Only get products with linked marketplace products
      product: {
        deletedAt: null, // Only include active marketplace products
        ...(search ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        } : {}),
      },
    };

    const vendorProducts = await db.vendorProduct.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform data to include product info at top level for easier frontend use
    // Filter out any with null product (extra safety)
    const products = vendorProducts
      .filter((vp) => vp.product !== null)
      .map((vp) => ({
        id: vp.id,
        vendorId: vp.vendorId,
        productId: vp.productId,
        price: vp.price,
        description: vp.description,
        stockQuantity: vp.stockQuantity,
        deliveryTime: vp.deliveryTime,
        isActive: vp.isActive,
        createdAt: vp.createdAt,
        updatedAt: vp.updatedAt,
        // Product info from admin
        name: vp.product!.name,
        imageUrl: vp.product!.imageUrl,
        unit: vp.product!.unit,
        productDescription: vp.product!.description, // Admin's default description
      }));

    return NextResponse.json({ ok: true, data: products });
  } catch (error) {
    console.error("Get vendor products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// POST /api/vendor/products - Add pricing for an admin product
export async function POST(request: NextRequest) {
  try {
    const session = await requireApprovedVendor();

    const body = await request.json();
    const validation = vendorProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { productId, price, description, stockQuantity, deliveryTime, isActive } = validation.data;

    // Verify the admin product exists and is active
    const adminProduct = await db.marketplaceProduct.findUnique({
      where: { id: productId },
    });

    if (!adminProduct || adminProduct.deletedAt || !adminProduct.isActive) {
      return NextResponse.json(
        { ok: false, error: "Product not found or not available" },
        { status: 404 }
      );
    }

    // Check if vendor already has this product
    const existingVendorProduct = await db.vendorProduct.findFirst({
      where: {
        vendorId: session.id,
        productId,
        deletedAt: null,
      },
    });

    if (existingVendorProduct) {
      return NextResponse.json(
        { ok: false, error: "You have already added pricing for this product" },
        { status: 400 }
      );
    }

    const vendorProduct = await db.vendorProduct.create({
      data: {
        vendorId: session.id,
        productId,
        price,
        description: description || null,
        stockQuantity: stockQuantity ?? 0,
        deliveryTime: deliveryTime || null,
        isActive: isActive ?? true,
      },
      include: {
        product: true,
      },
    });

    // Transform for frontend
    const result = {
      id: vendorProduct.id,
      vendorId: vendorProduct.vendorId,
      productId: vendorProduct.productId,
      price: vendorProduct.price,
      description: vendorProduct.description,
      stockQuantity: vendorProduct.stockQuantity,
      deliveryTime: vendorProduct.deliveryTime,
      isActive: vendorProduct.isActive,
      createdAt: vendorProduct.createdAt,
      name: vendorProduct.product?.name ?? "",
      imageUrl: vendorProduct.product?.imageUrl ?? null,
      unit: vendorProduct.product?.unit ?? "",
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error("Create vendor product error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
