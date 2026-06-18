import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireApprovedVendor } from "@/server/auth/rbac";
import { z } from "zod";

const selectCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  selected: z.boolean(),
});

// POST /api/vendor/categories/select - Select or deselect a category
export async function POST(request: NextRequest) {
  try {
    const session = await requireApprovedVendor();

    const body = await request.json();
    const validation = selectCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { categoryId, selected } = validation.data;

    // Verify category exists and is active
    const category = await db.marketplaceCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category || !category.isActive || category.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Category not found or not active" },
        { status: 404 }
      );
    }

    if (selected) {
      // Add selection (upsert to handle duplicates)
      await db.vendorCategorySelection.upsert({
        where: {
          vendorId_categoryId: {
            vendorId: session.id,
            categoryId,
          },
        },
        create: {
          vendorId: session.id,
          categoryId,
        },
        update: {}, // No update needed, just ensure it exists
      });

      return NextResponse.json({
        ok: true,
        message: `Category "${category.name}" selected`,
      });
    } else {
      // Remove selection
      await db.vendorCategorySelection.deleteMany({
        where: {
          vendorId: session.id,
          categoryId,
        },
      });

      return NextResponse.json({
        ok: true,
        message: `Category "${category.name}" deselected`,
      });
    }
  } catch (error) {
    console.error("Select vendor category error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: msg.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// PUT /api/vendor/categories/select - Bulk update category selections
export async function PUT(request: NextRequest) {
  try {
    const session = await requireApprovedVendor();

    const body = await request.json();
    const categoryIds = z.array(z.string()).parse(body.categoryIds);

    // Verify all categories exist and are active
    const categories = await db.marketplaceCategory.findMany({
      where: {
        id: { in: categoryIds },
        isActive: true,
        deletedAt: null,
      },
    });

    if (categories.length !== categoryIds.length) {
      return NextResponse.json(
        { ok: false, error: "One or more categories not found or not active" },
        { status: 400 }
      );
    }

    // Transaction: Delete all existing and add new selections
    await db.$transaction([
      // Remove all existing selections
      db.vendorCategorySelection.deleteMany({
        where: { vendorId: session.id },
      }),
      // Add new selections
      ...categoryIds.map((categoryId) =>
        db.vendorCategorySelection.create({
          data: {
            vendorId: session.id,
            categoryId,
          },
        })
      ),
    ]);

    return NextResponse.json({
      ok: true,
      message: `${categoryIds.length} categories selected`,
    });
  } catch (error) {
    console.error("Bulk select vendor categories error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: msg.includes("Forbidden") ? 403 : 500 }
    );
  }
}
