import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/middleware";
import { db } from "@/server/db";
import { z } from "zod";

const createServiceTemplateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  estimatedPrice: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  frequency: z.string().optional(),
  isCommon: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const updateServiceTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  estimatedPrice: z.number().int().positive().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  frequency: z.string().optional().nullable(),
  isCommon: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// GET /api/admin/equipment-types/[id]/service-templates - List service templates
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const templates = await db.equipmentServiceTemplate.findMany({
      where: { equipmentTypeId: params.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      data: templates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch service templates" },
      { status: error.status || 500 }
    );
  }
}

// POST /api/admin/equipment-types/[id]/service-templates - Create service template
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = createServiceTemplateSchema.parse(body);

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

    const template = await db.equipmentServiceTemplate.create({
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
      { ok: false, error: error.message || "Failed to create service template" },
      { status: error.status || 500 }
    );
  }
}

// PATCH /api/admin/equipment-types/[id]/service-templates - Update service template
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validated = updateServiceTemplateSchema.parse(body);

    const template = await db.equipmentServiceTemplate.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        description: validated.description,
        estimatedPrice: validated.estimatedPrice,
        duration: validated.duration,
        frequency: validated.frequency,
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
        { ok: false, error: "Service template not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update service template" },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/admin/equipment-types/[id]/service-templates - Delete service template
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

    await db.equipmentServiceTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({
      ok: true,
      message: "Service template deleted successfully",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Service template not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete service template" },
      { status: error.status || 500 }
    );
  }
}
