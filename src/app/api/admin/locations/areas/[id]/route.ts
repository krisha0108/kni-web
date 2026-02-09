import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateSchema = z.object({
  cityId: z.string().optional(),
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

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

    const existing = await db.serviceArea.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Area not found" },
        { status: 404 }
      );
    }

    const targetCityId = validation.data.cityId || existing.cityId;
    const targetName = validation.data.name || existing.name;

    if (validation.data.name || validation.data.cityId) {
      const duplicate = await db.serviceArea.findFirst({
        where: {
          cityId: targetCityId,
          name: targetName,
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { ok: false, error: "Area with this name already exists in this city" },
          { status: 409 }
        );
      }
    }

    const area = await db.serviceArea.update({
      where: { id },
      data: validation.data,
      include: {
        city: {
          select: {
            id: true,
            name: true,
            state: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: area });
  } catch (error) {
    console.error("Update service area error:", error);
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

    const area = await db.serviceArea.findUnique({
      where: { id },
      include: {
        _count: { select: { locationRequests: true } },
      },
    });

    if (!area) {
      return NextResponse.json(
        { ok: false, error: "Area not found" },
        { status: 404 }
      );
    }

    if (area._count.locationRequests > 0) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete area with vendor location requests. Remove requests first." },
        { status: 400 }
      );
    }

    await db.serviceArea.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete service area error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
