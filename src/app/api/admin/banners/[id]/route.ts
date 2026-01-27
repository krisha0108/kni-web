import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const bannerUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  linkUrl: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sortOrder: z.number().int().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /api/admin/banners/:id
 * Get a single banner
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const banner = await db.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      return NextResponse.json(
        { ok: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: banner });
  } catch (error: any) {
    console.error("Get banner error:", error);
    const message = error.message || "Internal server error";
    let status = 500;
    if (message.includes("Unauthorized")) status = 401;
    else if (message.includes("Forbidden")) status = 403;
    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}

/**
 * PATCH /api/admin/banners/:id
 * Update a banner
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = bannerUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    const banner = await db.banner.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, data: banner });
  } catch (error: any) {
    console.error("Update banner error:", error);
    const message = error.message || "Internal server error";
    let status = 500;
    if (message.includes("Unauthorized")) status = 401;
    else if (message.includes("Forbidden")) status = 403;
    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}

/**
 * DELETE /api/admin/banners/:id
 * Delete a banner
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await db.banner.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, message: "Banner deleted successfully" });
  } catch (error: any) {
    console.error("Delete banner error:", error);
    const message = error.message || "Internal server error";
    let status = 500;
    if (message.includes("Unauthorized")) status = 401;
    else if (message.includes("Forbidden")) status = 403;
    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}
