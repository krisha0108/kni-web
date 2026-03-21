import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/vendor-subscriptions
 * List all subscription requests with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      db.vendorSubscriptionRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          vendor: { select: { id: true, name: true, email: true, phone: true } },
          priceSentBy: { select: { id: true, name: true } },
          verifiedBy: { select: { id: true, name: true } },
        },
        ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      page > 0 ? db.vendorSubscriptionRequest.count({ where }) : Promise.resolve(-1),
    ]);

    return NextResponse.json({
      ok: true,
      data: page > 0 ? { items: requests, total, page, pageSize } : requests,
    });
  } catch (error) {
    console.error("List subscription requests error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
