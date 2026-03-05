import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

/**
 * GET /api/owner/amc-contracts
 * List all AMC contracts for a restaurant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    await requireRestaurantAccess(session, restaurantId, "amc:read");

    const contracts = await db.aMCContract.findMany({
      where: { restaurantId },
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
      { status: error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Unauthorized")) ? 401 : 500 }
    );
  }
}
