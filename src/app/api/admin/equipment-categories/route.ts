import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/middleware";
import { db } from "@/server/db";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

// GET /api/admin/equipment-categories - List all categories
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const categories = await db.equipmentCategory.findMany({
      include: {
        _count: {
          select: {
            equipmentTypes: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      data: categories,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch categories" },
      { status: error.status || 500 }
    );
  }
}

// POST /api/admin/equipment-categories - Create category
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = createCategorySchema.parse(body);

    // Check if category name already exists
    const existing = await db.equipmentCategory.findUnique({
      where: { name: validated.name },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Category with this name already exists" },
        { status: 400 }
      );
    }

    const category = await db.equipmentCategory.create({
      data: validated,
    });

    return NextResponse.json({
      ok: true,
      data: category,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create category" },
      { status: error.status || 500 }
    );
  }
}
