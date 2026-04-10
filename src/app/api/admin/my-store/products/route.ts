import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { getOrCreateSystemVendor } from "@/server/my-store";
import { z } from "zod";

const vendorProductSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  price: z.number().int().positive("Price must be a positive number"),
  description: z.string().optional(),
  stockQuantity: z.number().int().min(0).optional().default(0),
  deliveryTime: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  priceOnRequest: z.boolean().optional().default(false),
});

// GET /api/admin/my-store/products - List admin's store products
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    await getOrCreateSystemVendor(session.id);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {
      vendorId: session.id,
      deletedAt: null,
      productId: { not: null },
      product: {
        deletedAt: null,
        ...(search ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        } : {}),
      },
    };

    const [vendorProducts, total] = await Promise.all([
      db.vendorProduct.findMany({
        where,
        include: {
          product: {
            include: {
              marketplaceCategory: {
                select: { id: true, name: true },
              },
              marketplaceSubCategory: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.vendorProduct.count({ where }),
    ]);

    const products = vendorProducts
      .filter((vp) => vp.product !== null)
      .map((vp) => ({
        id: vp.id,
        vendorId: vp.vendorId,
        productId: vp.productId,
        price: vp.price,
        priceOnRequest: vp.priceOnRequest,
        description: vp.description,
        stockQuantity: vp.stockQuantity,
        deliveryTime: vp.deliveryTime,
        isActive: vp.isActive,
        createdAt: vp.createdAt,
        updatedAt: vp.updatedAt,
        name: vp.product!.name,
        imageUrl: vp.product!.imageUrl,
        unit: vp.product!.unit,
        productDescription: vp.product!.description,
        category: vp.product!.marketplaceCategory,
        subCategory: vp.product!.marketplaceSubCategory,
      }));

    return NextResponse.json({ ok: true, data: { items: products, total, page, pageSize } });
  } catch (error) {
    console.error("Get admin store products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// POST /api/admin/my-store/products - Add a product to admin's store
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    await getOrCreateSystemVendor(session.id);

    const body = await request.json();
    const validation = vendorProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { productId, price, description, stockQuantity, deliveryTime, isActive, priceOnRequest } = validation.data;

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

    // Check if admin already has this product in store
    const existingVendorProduct = await db.vendorProduct.findFirst({
      where: {
        vendorId: session.id,
        productId,
        deletedAt: null,
      },
    });

    if (existingVendorProduct) {
      return NextResponse.json(
        { ok: false, error: "You have already added this product to your store" },
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
        priceOnRequest: priceOnRequest ?? false,
      },
      include: {
        product: {
          include: {
            marketplaceCategory: {
              select: { id: true, name: true },
            },
            marketplaceSubCategory: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const result = {
      id: vendorProduct.id,
      vendorId: vendorProduct.vendorId,
      productId: vendorProduct.productId,
      price: vendorProduct.price,
      description: vendorProduct.description,
      stockQuantity: vendorProduct.stockQuantity,
      deliveryTime: vendorProduct.deliveryTime,
      isActive: vendorProduct.isActive,
      priceOnRequest: vendorProduct.priceOnRequest,
      createdAt: vendorProduct.createdAt,
      name: vendorProduct.product?.name ?? "",
      imageUrl: vendorProduct.product?.imageUrl ?? null,
      unit: vendorProduct.product?.unit ?? "",
      category: vendorProduct.product?.marketplaceCategory ?? null,
      subCategory: vendorProduct.product?.marketplaceSubCategory ?? null,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error("Create admin store product error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: msg.includes("Forbidden") ? 403 : 500 }
    );
  }
}
