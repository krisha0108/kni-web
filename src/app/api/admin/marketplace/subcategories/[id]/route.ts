import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateSchema = z.object({
  categoryId: z.string().optional(),
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

    const existing = await db.marketplaceSubCategory.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Subcategory not found" },
        { status: 404 }
      );
    }

    const updateData: any = { ...validation.data };
    const targetCategoryId = validation.data.categoryId || existing.categoryId;

    // Update slug if name changes
    if (validation.data.name && validation.data.name !== existing.name) {
      updateData.slug = generateSlug(validation.data.name);

      // Check for duplicate within category
      const duplicate = await db.marketplaceSubCategory.findFirst({
        where: {
          categoryId: targetCategoryId,
          slug: updateData.slug,
          NOT: { id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { ok: false, error: "Subcategory with this name already exists in this category" },
          { status: 409 }
        );
      }
    }

    const subCategory = await db.marketplaceSubCategory.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ ok: true, data: subCategory });
  } catch (error) {
    console.error("Update marketplace subcategory error:", error);
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

    const subCategory = await db.marketplaceSubCategory.findUnique({ where: { id } });

    if (!subCategory || subCategory.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Subcategory not found" },
        { status: 404 }
      );
    }

    // Soft delete the subcategory. Its products are NOT deleted — they stay
    // under the parent category, just detached from this subcategory.
    const deletedAt = new Date();
    // Free up the unique [categoryId, slug] so it can be recreated later
    const suffix = `__del_${deletedAt.getTime()}`;

    await db.$transaction([
      // Detach products from this subcategory (keep them under their category)
      db.marketplaceProduct.updateMany({
        where: { marketplaceSubCategoryId: id },
        data: { marketplaceSubCategoryId: null },
      }),
      // Soft delete the subcategory and free its unique slug
      db.marketplaceSubCategory.update({
        where: { id },
        data: { deletedAt, isActive: false, slug: `${subCategory.slug}${suffix}` },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete marketplace subcategory error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
