import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";

/**
 * GET /api/owner/amc-visits
 * Owner sees their visit schedule
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get("contractId");

    const where: any = {
      contract: { ownerId: session.id },
    };
    if (contractId) where.contractId = contractId;

    const visits = await db.aMCScheduledVisit.findMany({
      where,
      include: {
        contract: {
          select: {
            contractNumber: true,
            restaurant: { select: { name: true, city: true } },
          },
        },
        engineer: { select: { name: true, phone: true } },
      },
      orderBy: { scheduledDate: "asc" },
    });

    return NextResponse.json({ ok: true, data: visits });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
