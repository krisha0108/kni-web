import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  employmentType: z.string().optional().nullable(),
  externalApplyUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const position = await db.jobPosition.findUnique({
      where: { id },
      include: {
        _count: { select: { applications: true } },
      },
    });

    if (!position || position.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Job position not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: position });
  } catch (error) {
    console.error("Get job position error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await db.jobPosition.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Job position not found" },
        { status: 404 }
      );
    }

    const updateData: any = { ...validation.data };

    if (validation.data.title && validation.data.title !== existing.title) {
      updateData.slug = generateSlug(validation.data.title);

      const duplicate = await db.jobPosition.findFirst({
        where: { slug: updateData.slug, NOT: { id }, deletedAt: null },
      });

      if (duplicate) {
        return NextResponse.json(
          { ok: false, error: "A position with this title already exists" },
          { status: 409 }
        );
      }
    }

    const position = await db.jobPosition.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, data: position });
  } catch (error) {
    console.error("Update job position error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const position = await db.jobPosition.findUnique({ where: { id } });

    if (!position || position.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Job position not found" },
        { status: 404 }
      );
    }

    // Soft delete: applications stay intact (FK is onDelete: Cascade only for a
    // real hard delete, which this never does), and the slug is freed so the
    // same title can be reposted later.
    const deletedAt = new Date();
    const suffix = `__del_${deletedAt.getTime()}`;

    await db.jobPosition.update({
      where: { id },
      data: {
        deletedAt,
        isActive: false,
        slug: `${position.slug}${suffix}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete job position error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
