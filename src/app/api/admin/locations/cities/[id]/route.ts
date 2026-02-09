import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateSchema = z.object({
  stateId: z.string().optional(),
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

    const existing = await db.serviceCity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "City not found" },
        { status: 404 }
      );
    }

    const targetStateId = validation.data.stateId || existing.stateId;
    const targetName = validation.data.name || existing.name;

    if (validation.data.name || validation.data.stateId) {
      const duplicate = await db.serviceCity.findFirst({
        where: {
          stateId: targetStateId,
          name: targetName,
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { ok: false, error: "City with this name already exists in this state" },
          { status: 409 }
        );
      }
    }

    const city = await db.serviceCity.update({
      where: { id },
      data: validation.data,
      include: {
        state: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, data: city });
  } catch (error) {
    console.error("Update service city error:", error);
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

    const city = await db.serviceCity.findUnique({
      where: { id },
      include: {
        _count: { select: { areas: true } },
      },
    });

    if (!city) {
      return NextResponse.json(
        { ok: false, error: "City not found" },
        { status: 404 }
      );
    }

    if (city._count.areas > 0) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete city with areas. Remove areas first." },
        { status: 400 }
      );
    }

    await db.serviceCity.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete service city error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
