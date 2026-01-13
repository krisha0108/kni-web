import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/permissions";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  purpose: z.string().min(1).max(50),
  template: z.string().min(1),
  variables: z.array(z.string()).optional(),
  description: z.string().optional(),
});

// GET /api/admin/sms-templates - List all SMS templates
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get("isActive");

    const templates = await db.sMSTemplate.findMany({
      where: {
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      ok: true,
      data: templates,
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

// POST /api/admin/sms-templates - Create new SMS template
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = createTemplateSchema.safeParse(body);

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

    const { name, purpose, template, variables, description } = validation.data;

    // Check if template with same name already exists
    const existing = await db.sMSTemplate.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "SMS template with this name already exists",
        },
        { status: 400 }
      );
    }

    // Create template
    const smsTemplate = await db.sMSTemplate.create({
      data: {
        name,
        purpose,
        template,
        variables: variables || [],
        description: description || null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "SMS template created successfully",
      data: smsTemplate,
    });
  } catch (error: any) {
    console.error("Create SMS template error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
