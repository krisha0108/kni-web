import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one banner must be selected"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * POST /api/admin/banners/bulk-update
 * Bulk update multiple banners at once
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = bulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { ids, status, sortOrder } = validation.data;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const result = await db.banner.updateMany({
      where: {
        id: { in: ids },
      },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      message: `Updated ${result.count} banners`,
      count: result.count,
    });
  } catch (error: any) {
    console.error("Bulk update banners error:", error);
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
