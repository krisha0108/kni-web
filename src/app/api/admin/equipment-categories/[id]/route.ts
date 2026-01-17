import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/equipment-categories/[id] - Get single category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const category = await db.equipmentCategory.findUnique({
      where: { id },
      include: {
        equipmentTypes: {
          include: {
            _count: {
              select: {
                equipmentInstances: true,
                serviceTemplates: true,
                partTemplates: true,
              },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: category,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch category" },
      { status: error.status || 500 }
    );
  }
}

// PATCH /api/admin/equipment-categories/[id] - Update category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validated = updateCategorySchema.parse(body);

    // If updating name, check uniqueness
    if (validated.name) {
      const existing = await db.equipmentCategory.findFirst({
        where: {
          name: validated.name,
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { ok: false, error: "Category with this name already exists" },
          { status: 400 }
        );
      }
    }

    const category = await db.equipmentCategory.update({
      where: { id },
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
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update category" },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/admin/equipment-categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check if category has equipment types
    const category = await db.equipmentCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { equipmentTypes: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    if (category._count.equipmentTypes > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot delete category with ${category._count.equipmentTypes} equipment types. Delete or reassign them first.`,
        },
        { status: 400 }
      );
    }

    await db.equipmentCategory.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete category" },
      { status: error.status || 500 }
    );
  }
}
