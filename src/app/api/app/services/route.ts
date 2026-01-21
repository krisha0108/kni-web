import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/app/services
 * Public endpoint to fetch services for mobile app
 * Fetches from ServiceItem table (admin-managed services)
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

    // Fetch from ServiceItem table (admin-managed services)
    const services = await db.serviceItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        isActive: true,
        categoryId: true,
        subCategoryId: true,
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
      orderBy: [
        { name: 'asc' },
      ],
    });

    // Format for mobile app
    const formatted = services.map((s) => ({
      id: s.id,
      name: s.name,
      title: s.name,
      description: s.description,
      price: s.price || 0,
      estimated_price: s.price || 0,
      is_active: s.isActive,
      category_id: s.categoryId,
      subcategory_id: s.subCategoryId,
      category: s.category?.name || 'General',
      subcategory: s.subCategory?.name || null,
      created_at: s.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Get services error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch services" },
      { status: 500 }
    );
  }
}
