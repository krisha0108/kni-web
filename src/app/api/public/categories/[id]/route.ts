import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [category, services, parts] = await Promise.all([
      db.category.findUnique({
        where: { id },
        include: {
          subCategories: { where: { isActive: true, deletedAt: null } },
        },
      }),
      db.serviceItem.findMany({
        where: { categoryId: id, isActive: true, deletedAt: null },
        include: { subCategory: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      }),
      db.partItem.findMany({
        where: { categoryId: id, isActive: true, deletedAt: null },
        include: { subCategory: { select: { id: true, name: true } } },
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
      data: { category, services, parts },
    });
  } catch (error) {
    console.error("Get category items error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
