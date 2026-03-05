import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

/**
 * GET /api/owner/amc-visits
 * Owner sees their visit schedule for a restaurant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get("contractId");
    const restaurantId = searchParams.get("restaurantId");

    // If contractId provided, fetch the contract to get restaurantId for RBAC
    let resolvedRestaurantId = restaurantId;

    if (contractId && !resolvedRestaurantId) {
      const contract = await db.aMCContract.findUnique({
        where: { id: contractId },
        select: { restaurantId: true },
      });
      if (!contract) {
        return NextResponse.json({ ok: false, error: "Contract not found" }, { status: 404 });
      }
      resolvedRestaurantId = contract.restaurantId;
    }

    if (!resolvedRestaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID or Contract ID required" },
        { status: 400 }
      );
    }

    // RBAC: verify user has amc:read access for this restaurant
    await requireRestaurantAccess(session, resolvedRestaurantId, "amc:read");

    const where: any = {
      contract: { restaurantId: resolvedRestaurantId },
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
      { status: error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Unauthorized")) ? 401 : 500 }
    );
  }
}
