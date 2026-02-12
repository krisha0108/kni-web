import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";

/**
 * GET /api/owner/amc-contracts
 * List all AMC contracts for the logged-in owner
 */
export async function GET() {
  try {
    const session = await requireOwner();

    const contracts = await db.aMCContract.findMany({
      where: { ownerId: session.id },
      include: {
        restaurant: { select: { id: true, name: true, city: true } },
        scheduledVisits: {
          select: { id: true, status: true, scheduledDate: true, completedDate: true },
          orderBy: { scheduledDate: "asc" },
        },
        breakdownRequests: {
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: contracts });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
