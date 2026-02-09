import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";

// GET /api/vendor/categories - Get all active marketplace categories with vendor's selections
export async function GET(request: NextRequest) {
  try {
    const session = await requireVendor();

    // Get all active marketplace categories
    const categories = await db.marketplaceCategory.findMany({
      where: { isActive: true },
      include: {
        subCategories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // Get vendor's selected categories
    const vendorSelections = await db.vendorCategorySelection.findMany({
      where: { vendorId: session.id },
      select: { categoryId: true },
    });

    const selectedCategoryIds = new Set(vendorSelections.map((s) => s.categoryId));

    // Transform to include selection status
    const categoriesWithSelection = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
      productCount: category._count.products,
      subCategories: category.subCategories,
      isSelected: selectedCategoryIds.has(category.id),
    }));

    return NextResponse.json({
      ok: true,
      data: categoriesWithSelection,
    });
  } catch (error) {
    console.error("Get vendor categories error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
