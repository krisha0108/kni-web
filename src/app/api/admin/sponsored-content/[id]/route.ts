import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateSchema = z.object({
  type: z.enum(["VENDOR", "PRODUCT", "SERVICE", "GENERAL"]).optional(),
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  linkUrl: z.string().url().optional().or(z.literal("")),
  sponsoredBy: z.string().min(2).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const content = await db.sponsoredContent.findUnique({ where: { id } });
    if (!content) return NextResponse.json({ ok: false, error: "Content not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: content });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ ok: false, error: validation.error.issues[0].message }, { status: 400 });
    }

    const data = validation.data;
    const updateData: any = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl || null;
    if (data.sponsoredBy !== undefined) updateData.sponsoredBy = data.sponsoredBy;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const content = await db.sponsoredContent.update({ where: { id }, data: updateData });
    return NextResponse.json({ ok: true, data: content });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.sponsoredContent.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: "Sponsored content deleted" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
