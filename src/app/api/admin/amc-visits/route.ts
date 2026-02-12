import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/amc-visits
 * List all AMC scheduled visits with filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const contractId = searchParams.get("contractId");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (contractId) where.contractId = contractId;

    const visits = await db.aMCScheduledVisit.findMany({
      where,
      include: {
        contract: {
          include: {
            restaurant: { select: { name: true, city: true, address: true } },
            owner: { select: { name: true, phone: true } },
          },
        },
        engineer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { scheduledDate: "asc" },
    });

    return NextResponse.json({ ok: true, data: visits });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
