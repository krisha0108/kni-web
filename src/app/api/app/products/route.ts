import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/app/products
 * Public endpoint to fetch products/equipment types for mobile app
 * Products are essentially equipment categories or types that can be serviced
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");

    // Fetch categories as products (equipment types)
    const where: any = {
      isActive: true,
      deletedAt: null,
    };

    if (categoryId) {
      where.id = categoryId;
    }

    if (search) {
      where.name = { contains: search };
    }

    const categories = await db.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        isActive: true,
        _count: {
          select: {
            serviceItems: { where: { isActive: true, deletedAt: null } },
            partItems: { where: { isActive: true, deletedAt: null } },
          },
        },
        serviceItems: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            name: true,
            price: true,
            description: true,
          },
          take: 10,
        },
        partItems: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            name: true,
            price: true,
            description: true,
            imageUrl: true,
          },
          take: 10,
        },
      },
      orderBy: { name: "asc" },
    });

    // Format as products for mobile app
    const products = categories.map((c) => ({
      id: c.id,
      title: c.name,
      name: c.name,
      description: null, // Category doesn't have description
      image: null, // Category doesn't have imageUrl
      featured_image: null,
      category: c.name,
      is_active: c.isActive,
      services_count: c._count.serviceItems,
      parts_count: c._count.partItems,
      services: c.serviceItems.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price || 0,
        description: s.description,
      })),
      parts: c.partItems.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price || 0,
        description: p.description,
        image: p.imageUrl,
      })),
    }));

    return NextResponse.json({
      ok: true,
      data: products,
      total: products.length,
    });
  } catch (error: any) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}
