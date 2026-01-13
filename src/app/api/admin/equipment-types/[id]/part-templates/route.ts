import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/middleware";
import { db } from "@/server/db";
import { z } from "zod";

const createPartTemplateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  partNumber: z.string().optional(),
  description: z.string().optional(),
  estimatedPrice: z.number().int().positive().optional(),
  isCommon: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const updatePartTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  partNumber: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  estimatedPrice: z.number().int().positive().optional().nullable(),
  isCommon: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// GET /api/admin/equipment-types/[id]/part-templates - List part templates
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const templates = await db.equipmentPartTemplate.findMany({
      where: { equipmentTypeId: params.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      data: templates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch part templates" },
      { status: error.status || 500 }
    );
  }
}

// POST /api/admin/equipment-types/[id]/part-templates - Create part template
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = createPartTemplateSchema.parse(body);

    // Check if equipment type exists
    const equipmentType = await db.equipmentType.findUnique({
      where: { id: params.id },
    });

    if (!equipmentType) {
      return NextResponse.json(
        { ok: false, error: "Equipment type not found" },
        { status: 404 }
      );
    }

    const template = await db.equipmentPartTemplate.create({
      data: {
        ...validated,
        equipmentTypeId: params.id,
      },
    });

    return NextResponse.json({
      ok: true,
      data: template,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create part template" },
      { status: error.status || 500 }
    );
  }
}

// PATCH /api/admin/equipment-types/[id]/part-templates - Update part template
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = updatePartTemplateSchema.parse(body);

    const template = await db.equipmentPartTemplate.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        partNumber: validated.partNumber,
        description: validated.description,
        estimatedPrice: validated.estimatedPrice,
        isCommon: validated.isCommon,
        sortOrder: validated.sortOrder,
      },
    });

    return NextResponse.json({
      ok: true,
      data: template,
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
        { ok: false, error: "Part template not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update part template" },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/admin/equipment-types/[id]/part-templates - Delete part template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const templateId = request.nextUrl.searchParams.get("templateId");
    if (!templateId) {
      return NextResponse.json(
        { ok: false, error: "Template ID required" },
        { status: 400 }
      );
    }

    await db.equipmentPartTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({
      ok: true,
      message: "Part template deleted successfully",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Part template not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete part template" },
      { status: error.status || 500 }
    );
  }
}
