import { NextResponse } from "next/server";
import { db } from "@/server/db";

// GET /api/public/marketplace-categories - Public endpoint for vendor registration
export async function GET() {
  try {
    const categories = await db.marketplaceCategory.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get public categories error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
