import { NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/app/categories
 * Public endpoint to fetch categories for mobile app
 */
export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true, deletedAt: null },
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
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, data: categories });
  } catch (error: any) {
    console.error("Get app categories error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
