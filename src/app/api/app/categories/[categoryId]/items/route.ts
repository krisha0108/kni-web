import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/app/categories/[categoryId]/items
 * Fetch services and parts for a specific category
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params;

    const [category, services, parts] = await Promise.all([
      db.category.findUnique({
        where: { id: categoryId },
        select: {
          id: true,
          name: true,
        },
      }),
      db.serviceItem.findMany({
        where: { categoryId, isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      }),
      db.partItem.findMany({
        where: { categoryId, isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        category,
        services,
        parts,
      },
    });
  } catch (error: any) {
    console.error("Get category items error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
