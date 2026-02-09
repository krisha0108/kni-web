import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor, requireApprovedVendor } from "@/server/auth/rbac";
import { z } from "zod";

// Vendors can only update their pricing info, not the product itself
const updateVendorProductSchema = z.object({
  price: z.number().int().positive().optional(),
  description: z.string().optional().nullable(),
  stockQuantity: z.number().int().min(0).optional(),
  deliveryTime: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/vendor/products/[id] - Get single vendor product with admin product info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVendor();
    const { id } = await params;

    const vendorProduct = await db.vendorProduct.findFirst({
      where: {
        id,
        vendorId: session.id,
        deletedAt: null,
      },
      include: {
        product: true,
      },
    });

    if (!vendorProduct) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

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
      updatedAt: vendorProduct.updatedAt,
      // Product info from admin
      name: vendorProduct.product?.name ?? "",
      imageUrl: vendorProduct.product?.imageUrl ?? null,
      unit: vendorProduct.product?.unit ?? "",
      productDescription: vendorProduct.product?.description ?? null,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error("Get vendor product error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/vendor/products/[id] - Update vendor's pricing for a product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApprovedVendor();
    const { id } = await params;

    const body = await request.json();
    const validation = updateVendorProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify product belongs to this vendor
    const existing = await db.vendorProduct.findFirst({
      where: { id, vendorId: session.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const { price, description, stockQuantity, deliveryTime, isActive } = validation.data;

    const vendorProduct = await db.vendorProduct.update({
      where: { id },
      data: {
        ...(price !== undefined ? { price } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(stockQuantity !== undefined ? { stockQuantity } : {}),
        ...(deliveryTime !== undefined ? { deliveryTime } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        updatedAt: new Date(),
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
      updatedAt: vendorProduct.updatedAt,
      name: vendorProduct.product?.name ?? "",
      imageUrl: vendorProduct.product?.imageUrl ?? null,
      unit: vendorProduct.product?.unit ?? "",
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error("Update vendor product error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: msg.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// DELETE /api/vendor/products/[id] - Remove vendor's listing for a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApprovedVendor();
    const { id } = await params;

    // Verify product belongs to this vendor
    const existing = await db.vendorProduct.findFirst({
      where: { id, vendorId: session.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Soft delete the vendor's listing
    await db.vendorProduct.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: "Product listing removed" });
  } catch (error) {
    console.error("Delete vendor product error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: msg.includes("Forbidden") ? 403 : 500 }
    );
  }
}
