import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        subCategories: {
          where: { isActive: true, deletedAt: null },
          select: { id: true, name: true },
        },
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
  } catch (error) {
    console.error("Get public categories error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
