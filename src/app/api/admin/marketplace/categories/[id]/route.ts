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
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: {
            products: true,
            vendorCategories: true,
          },
        },
      },
    });

    if (!category) {
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
    if (!existing) {
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

    // Check if category has products
    const category = await db.marketplaceCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, subCategories: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    if (category._count.products > 0 || category._count.subCategories > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Cannot delete category with products or subcategories. Remove them first.",
        },
        { status: 400 }
      );
    }

    await db.marketplaceCategory.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete marketplace category error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
