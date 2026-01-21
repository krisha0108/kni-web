import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const guideUpdateSchema = z.object({
  thumbUrl: z.string().url().optional(),
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  minutes: z.number().int().min(0).optional(),
  linkUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const guide = await db.guide.findUnique({ where: { id } });
    if (!guide) return NextResponse.json({ ok: false, error: "Guide not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: guide });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const validation = guideUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ ok: false, error: validation.error.issues[0].message }, { status: 400 });
    }
    const guide = await db.guide.update({ where: { id }, data: validation.data });
    return NextResponse.json({ ok: true, data: guide });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.guide.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: "Guide deleted" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
