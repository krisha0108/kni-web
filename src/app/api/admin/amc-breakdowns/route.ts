import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/amc-breakdowns
 * List all breakdown requests
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {};
    if (status && status !== "ALL") where.status = status;

    const [breakdowns, total] = await Promise.all([
      db.aMCBreakdownRequest.findMany({
        where,
        include: {
          contract: {
            include: {
              restaurant: { select: { name: true, city: true } },
              owner: { select: { name: true, phone: true } },
            },
          },
          owner: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.aMCBreakdownRequest.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: breakdowns, total, page, pageSize },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
