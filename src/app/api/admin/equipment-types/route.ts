import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { z } from "zod";

const createTypeSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  brand: z.string().optional(),
  avgLifespanMonths: z.number().int().positive().optional(),
  avgWarrantyMonths: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

// GET /api/admin/equipment-types - List all types (optionally filtered by category)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const categoryId = request.nextUrl.searchParams.get("categoryId");

    const types = await db.equipmentType.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: true,
        _count: {
          select: {
            equipmentInstances: true,
            serviceTemplates: true,
            partTemplates: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      ok: true,
      data: types,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch equipment types" },
      { status: error.status || 500 }
    );
  }
}

// POST /api/admin/equipment-types - Create equipment type
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = createTypeSchema.parse(body);

    // Check if category exists
    const category = await db.equipmentCategory.findUnique({
      where: { id: validated.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if type name already exists in this category
    const existing = await db.equipmentType.findFirst({
      where: {
        categoryId: validated.categoryId,
        name: validated.name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Equipment type with this name already exists in this category" },
        { status: 400 }
      );
    }

    const type = await db.equipmentType.create({
      data: {
        ...validated,
        imageUrl: validated.imageUrl || null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: type,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create equipment type" },
      { status: error.status || 500 }
    );
  }
}
