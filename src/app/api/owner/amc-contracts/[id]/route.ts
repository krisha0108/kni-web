import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

/**
 * GET /api/owner/amc-contracts/[id]
 * Get contract detail with visits and breakdowns
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const contract = await db.aMCContract.findUnique({
      where: { id },
      include: {
        restaurant: { select: { id: true, name: true, city: true, address: true } },
        proposal: { select: { responseTimeSLA: true, resolutionTimeSLA: true, exclusions: true, sparePartsPolicy: true } },
        scheduledVisits: {
          include: {
            engineer: { select: { name: true, phone: true } },
          },
          orderBy: { scheduledDate: "asc" },
        },
        breakdownRequests: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ ok: false, error: "Contract not found" }, { status: 404 });
    }

    // Validate RBAC access using the contract's restaurantId
    await requireRestaurantAccess(session, contract.restaurantId, "amc:read");

    return NextResponse.json({ ok: true, data: contract });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
