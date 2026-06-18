import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const category = await db.marketplaceCategory.findUnique({
      where: { id },
      include: {
        subCategories: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: {
            // Only count live products; soft-deleted ones are excluded
            products: { where: { deletedAt: null } },
            vendorCategories: true,
          },
        },
      },
    });

    if (!category || category.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: category });
  } catch (error) {
    console.error("Get marketplace category error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await db.marketplaceCategory.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    const updateData: any = { ...validation.data };

    // Update slug if name changes
    if (validation.data.name && validation.data.name !== existing.name) {
      updateData.slug = generateSlug(validation.data.name);

      // Check for duplicate
      const duplicate = await db.marketplaceCategory.findFirst({
        where: {
          OR: [{ name: validation.data.name }, { slug: updateData.slug }],
          NOT: { id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { ok: false, error: "Category with this name already exists" },
          { status: 409 }
        );
      }
    }

    const category = await db.marketplaceCategory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, data: category });
  } catch (error) {
    console.error("Update marketplace category error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const category = await db.marketplaceCategory.findUnique({ where: { id } });

    if (!category || category.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Soft delete: hide the category and cascade-hide everything under it.
    // Nothing is physically removed, so order history (MarketplaceOrderItem)
    // and any FK references stay intact and can be audited/restored.
    const deletedAt = new Date();
    // Free up the unique name/slug so an identical category can be created later
    const suffix = `__del_${deletedAt.getTime()}`;

    // Collect live products under this category to also hide their vendor offers
    const products = await db.marketplaceProduct.findMany({
      where: { marketplaceCategoryId: id, deletedAt: null },
      select: { id: true },
    });
    const productIds = products.map((p) => p.id);

    await db.$transaction([
      // 1. Hide vendor products (vendor pricing) for these products
      ...(productIds.length
        ? [
            db.vendorProduct.updateMany({
              where: { productId: { in: productIds }, deletedAt: null },
              data: { deletedAt, isActive: false },
            }),
          ]
        : []),
      // 2. Soft delete the master products in this category
      db.marketplaceProduct.updateMany({
        where: { marketplaceCategoryId: id, deletedAt: null },
        data: { deletedAt, isActive: false },
      }),
      // 3. Soft delete the subcategories in this category
      db.marketplaceSubCategory.updateMany({
        where: { categoryId: id, deletedAt: null },
        data: { deletedAt, isActive: false },
      }),
      // 4. Remove vendor category selections (join rows, safe to hard delete)
      db.vendorCategorySelection.deleteMany({ where: { categoryId: id } }),
      // 5. Soft delete the category itself and free its unique name/slug
      db.marketplaceCategory.update({
        where: { id },
        data: {
          deletedAt,
          isActive: false,
          name: `${category.name}${suffix}`,
          slug: `${category.slug}${suffix}`,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete marketplace category error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
