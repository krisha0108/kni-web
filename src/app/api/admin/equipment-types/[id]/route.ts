import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/middleware";
import { db } from "@/server/db";
import { z } from "zod";

const updateTypeSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  avgLifespanMonths: z.number().int().positive().optional(),
  avgWarrantyMonths: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

// GET /api/admin/equipment-types/[id] - Get single equipment type with templates
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const type = await db.equipmentType.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        serviceTemplates: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
        partTemplates: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
        _count: {
          select: {
            equipmentInstances: true,
          },
        },
      },
    });

    if (!type) {
      return NextResponse.json(
        { ok: false, error: "Equipment type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: type,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch equipment type" },
      { status: error.status || 500 }
    );
  }
}

// PATCH /api/admin/equipment-types/[id] - Update equipment type
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = updateTypeSchema.parse(body);

    // Get current type to check category
    const currentType = await db.equipmentType.findUnique({
      where: { id: params.id },
    });

    if (!currentType) {
      return NextResponse.json(
        { ok: false, error: "Equipment type not found" },
        { status: 404 }
      );
    }

    // If updating name, check uniqueness within category
    if (validated.name) {
      const existing = await db.equipmentType.findFirst({
        where: {
          categoryId: currentType.categoryId,
          name: validated.name,
          NOT: { id: params.id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { ok: false, error: "Equipment type with this name already exists in this category" },
          { status: 400 }
        );
      }
    }

    const type = await db.equipmentType.update({
      where: { id: params.id },
      data: {
        ...validated,
        imageUrl: validated.imageUrl === "" ? null : validated.imageUrl,
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
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Equipment type not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update equipment type" },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/admin/equipment-types/[id] - Delete equipment type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    // Check if type has equipment instances
    const type = await db.equipmentType.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            equipmentInstances: true,
            serviceTemplates: true,
            partTemplates: true,
          },
        },
      },
    });

    if (!type) {
      return NextResponse.json(
        { ok: false, error: "Equipment type not found" },
        { status: 404 }
      );
    }

    if (type._count.equipmentInstances > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot delete equipment type with ${type._count.equipmentInstances} equipment instances. Delete or reassign them first.`,
        },
        { status: 400 }
      );
    }

    // Delete associated templates first
    await db.equipmentServiceTemplate.deleteMany({
      where: { equipmentTypeId: params.id },
    });

    await db.equipmentPartTemplate.deleteMany({
      where: { equipmentTypeId: params.id },
    });

    // Delete the type
    await db.equipmentType.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      ok: true,
      message: "Equipment type deleted successfully",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Equipment type not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete equipment type" },
      { status: error.status || 500 }
    );
  }
}
