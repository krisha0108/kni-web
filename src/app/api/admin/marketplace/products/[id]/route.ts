import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  unit: z.string().min(1, "Unit is required").optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  marketplaceCategoryId: z.string().optional(),
  marketplaceSubCategoryId: z.string().optional().nullable(),
});

// GET /api/admin/marketplace/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const product = await db.marketplaceProduct.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true },
        },
        marketplaceCategory: {
          select: { id: true, name: true },
        },
        marketplaceSubCategory: {
          select: { id: true, name: true },
        },
        vendorProducts: {
          where: { deletedAt: null },
          include: {
            vendor: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!product || product.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: product,
    });
  } catch (error) {
    console.error("Get marketplace product error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// PATCH /api/admin/marketplace/products/[id] - Update product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const validation = updateProductSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await db.marketplaceProduct.findUnique({
      where: { id },
    });

    if (!existingProduct || existingProduct.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const { name, imageUrl, unit, description, isActive, marketplaceCategoryId, marketplaceSubCategoryId } = validation.data;

    // Check for duplicate name if name is being changed
    if (name && name !== existingProduct.name) {
      const duplicateProduct = await db.marketplaceProduct.findFirst({
        where: {
          name: { equals: name },
          deletedAt: null,
          NOT: { id },
        },
      });

      if (duplicateProduct) {
        return NextResponse.json(
          { ok: false, error: "A product with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Verify category exists if being changed
    if (marketplaceCategoryId) {
      const category = await db.marketplaceCategory.findUnique({
        where: { id: marketplaceCategoryId },
      });

      if (!category) {
        return NextResponse.json(
          { ok: false, error: "Category not found" },
          { status: 404 }
        );
      }
    }

    // Verify subcategory if being changed
    const targetCategoryId = marketplaceCategoryId || existingProduct.marketplaceCategoryId;
    if (marketplaceSubCategoryId && targetCategoryId) {
      const subCategory = await db.marketplaceSubCategory.findFirst({
        where: {
          id: marketplaceSubCategoryId,
          categoryId: targetCategoryId,
        },
      });

      if (!subCategory) {
        return NextResponse.json(
          { ok: false, error: "Subcategory not found or does not belong to selected category" },
          { status: 404 }
        );
      }
    }

    const product = await db.marketplaceProduct.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(marketplaceCategoryId !== undefined ? { marketplaceCategoryId } : {}),
        ...(marketplaceSubCategoryId !== undefined ? { marketplaceSubCategoryId: marketplaceSubCategoryId || null } : {}),
      },
      include: {
        creator: {
          select: { id: true, name: true },
        },
        marketplaceCategory: {
          select: { id: true, name: true },
        },
        marketplaceSubCategory: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: product,
    });
  } catch (error) {
    console.error("Update marketplace product error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/marketplace/products/[id] - Soft delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check if product exists
    const existingProduct = await db.marketplaceProduct.findUnique({
      where: { id },
      include: {
        vendorProducts: {
          where: { deletedAt: null },
        },
      },
    });

    if (!existingProduct || existingProduct.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Soft delete the product and all vendor products associated with it
    await db.$transaction([
      // Soft delete all vendor products
      db.vendorProduct.updateMany({
        where: { productId: id, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
      }),
      // Soft delete the marketplace product
      db.marketplaceProduct.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete marketplace product error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
