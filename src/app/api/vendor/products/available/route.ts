import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";

// GET /api/vendor/products/available - Get admin products that vendor hasn't added pricing to
// Only shows products from categories the vendor has selected
export async function GET(request: NextRequest) {
  try {
    const session = await requireVendor();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const subCategoryId = searchParams.get("subCategoryId");

    // Get vendor's selected categories
    const vendorSelections = await db.vendorCategorySelection.findMany({
      where: { vendorId: session.id },
      select: { categoryId: true },
    });

    const selectedCategoryIds = vendorSelections.map((s) => s.categoryId);

    // If vendor hasn't selected any categories, return empty array
    if (selectedCategoryIds.length === 0) {
      return NextResponse.json({
        ok: true,
        data: [],
        message: "Please select categories first to see available products",
      });
    }

    // Get IDs of products vendor already has
    const vendorProductIds = await db.vendorProduct.findMany({
      where: {
        vendorId: session.id,
        deletedAt: null,
        productId: { not: null },
      },
      select: { productId: true },
    });

    // Filter out null productIds
    const existingProductIds = vendorProductIds
      .map((vp) => vp.productId)
      .filter((id): id is string => id !== null);

    // Build filter for category
    let categoryFilter: any = { marketplaceCategoryId: { in: selectedCategoryIds } };
    if (categoryId) {
      // Verify the requested category is one the vendor has selected
      if (!selectedCategoryIds.includes(categoryId)) {
        return NextResponse.json({
          ok: true,
          data: [],
          message: "You have not selected this category",
        });
      }
      categoryFilter = { marketplaceCategoryId: categoryId };
    }

    // Get admin products that vendor hasn't added yet, filtered by selected categories
    const where: any = {
      isActive: true,
      deletedAt: null,
      ...categoryFilter,
      ...(subCategoryId ? { marketplaceSubCategoryId: subCategoryId } : {}),
      NOT: {
        id: { in: existingProductIds },
      },
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      } : {}),
    };

    const availableProducts = await db.marketplaceProduct.findMany({
      where,
      include: {
        marketplaceCategory: {
          select: { id: true, name: true },
        },
        marketplaceSubCategory: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { marketplaceCategory: { name: "asc" } },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      ok: true,
      data: availableProducts,
    });
  } catch (error) {
    console.error("Get available products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
