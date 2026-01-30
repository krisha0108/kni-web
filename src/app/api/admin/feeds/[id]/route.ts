import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const feedUpdateSchema = z.object({
  text: z.string().min(3).optional(),
  tone: z.enum(["OK", "INFO", "WARN", "DANGER"]).optional(),
  icon: z.string().optional(),
  linkUrl: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const feed = await db.feed.findUnique({ where: { id } });
    if (!feed) {
      return NextResponse.json({ ok: false, error: "Feed not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: feed });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status || 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const validation = feedUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ ok: false, error: validation.error.issues[0].message }, { status: 400 });
    }

    const data = validation.data;
    const updateData: any = {};
    if (data.text !== undefined) updateData.text = data.text;
    if (data.tone !== undefined) updateData.tone = data.tone;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const feed = await db.feed.update({ where: { id }, data: updateData });
    return NextResponse.json({ ok: true, data: feed });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.feed.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: "Feed deleted" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
