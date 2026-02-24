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

    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const requests = await db.vendorSubscriptionRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { id: true, name: true, email: true, phone: true } },
        priceSentBy: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, data: requests });
  } catch (error) {
    console.error("List subscription requests error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
