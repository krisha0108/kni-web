import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateVendorProductSchema = z.object({
  price: z.number().int().positive().optional(),
  description: z.string().optional().nullable(),
  stockQuantity: z.number().int().min(0).optional(),
  deliveryTime: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/my-store/products/[id] - Single product detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
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
      productDescription: vendorProduct.product?.description ?? null,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error("Get admin store product error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/my-store/products/[id] - Update product pricing/details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = updateVendorProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify product belongs to admin
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
    console.error("Update admin store product error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: msg.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// DELETE /api/admin/my-store/products/[id] - Soft delete product listing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await db.vendorProduct.findFirst({
      where: { id, vendorId: session.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    await db.vendorProduct.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: "Product listing removed" });
  } catch (error) {
    console.error("Delete admin store product error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: msg.includes("Forbidden") ? 403 : 500 }
    );
  }
}
