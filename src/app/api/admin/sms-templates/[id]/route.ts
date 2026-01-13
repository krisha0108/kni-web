import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/permissions";
import { z } from "zod";

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  purpose: z.string().min(1).max(50).optional(),
  template: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/sms-templates/[id] - Get single template
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const params = await context.params;
    const { id } = params;

    const template = await db.sMSTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        {
          ok: false,
          error: "SMS template not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: template,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// PATCH /api/admin/sms-templates/[id] - Update template
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const params = await context.params;
    const { id } = params;

    const body = await request.json();
    const validation = updateTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    // Check if template exists
    const existing = await db.sMSTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "SMS template not found",
        },
        { status: 404 }
      );
    }

    // Update template
    const updated = await db.sMSTemplate.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({
      ok: true,
      message: "SMS template updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Update SMS template error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// DELETE /api/admin/sms-templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const params = await context.params;
    const { id } = params;

    // Check if template exists
    const existing = await db.sMSTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "SMS template not found",
        },
        { status: 404 }
      );
    }

    // Delete template
    await db.sMSTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: "SMS template deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete SMS template error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
