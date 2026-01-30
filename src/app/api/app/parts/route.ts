import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/app/parts
 * Public endpoint to fetch parts for mobile app
 * Fetches from PartItem table (admin-managed parts)
 * Can filter by category_id or subcategory_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("category_id");
    const subCategoryId = searchParams.get("subcategory_id");
    const search = searchParams.get("search");

    const where: any = {
      isActive: true,
      deletedAt: null,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (subCategoryId) {
      where.subCategoryId = subCategoryId;
    }

    if (search) {
      where.name = { contains: search };
    }

    const parts = await db.partItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        isActive: true,
        categoryId: true,
        subCategoryId: true,
        imageUrl: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: [{ name: "asc" }],
    });

    // Format for mobile app
    const formatted = parts.map((p) => ({
      id: p.id,
      name: p.name,
      title: p.name,
      description: p.description,
      price: p.price || 0,
      image_url: p.imageUrl,
      is_active: p.isActive,
      category_id: p.categoryId,
      subcategory_id: p.subCategoryId,
      category: p.category?.name || "General",
      subcategory: p.subCategory?.name || null,
      created_at: p.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Get parts error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch parts" },
      { status: 500 }
    );
  }
}
