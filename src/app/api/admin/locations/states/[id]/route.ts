import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateSchema = z.object({
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

    const existing = await db.serviceState.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "State not found" },
        { status: 404 }
      );
    }

    if (validation.data.name && validation.data.name !== existing.name) {
      const duplicate = await db.serviceState.findUnique({
        where: { name: validation.data.name },
      });
      if (duplicate) {
        return NextResponse.json(
          { ok: false, error: "State with this name already exists" },
          { status: 409 }
        );
      }
    }

    const state = await db.serviceState.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ ok: true, data: state });
  } catch (error) {
    console.error("Update service state error:", error);
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

    const state = await db.serviceState.findUnique({
      where: { id },
      include: {
        _count: { select: { cities: true } },
      },
    });

    if (!state) {
      return NextResponse.json(
        { ok: false, error: "State not found" },
        { status: 404 }
      );
    }

    if (state._count.cities > 0) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete state with cities. Remove cities first." },
        { status: 400 }
      );
    }

    await db.serviceState.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete service state error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
