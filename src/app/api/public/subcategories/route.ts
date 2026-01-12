import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  try {
    const subcategories = await db.subCategory.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { category: { name: "asc" } },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ ok: true, data: subcategories });
  } catch (error) {
    console.error("Get subcategories error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
