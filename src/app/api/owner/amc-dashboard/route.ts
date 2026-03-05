import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

/**
 * GET /api/owner/amc-dashboard
 * Owner AMC dashboard data
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

    const where = {
      restaurantId,
    };

    const [contracts, requests, breakdowns] = await Promise.all([
      db.aMCContract.findMany({
        where,
        include: {
          restaurant: { select: { name: true } },
          scheduledVisits: { select: { status: true, scheduledDate: true } },
        },
      }),
      db.aMCRequest.findMany({
        where,
        select: { id: true, status: true },
      }),
      db.aMCBreakdownRequest.findMany({
        where: {
          contract: { restaurantId },
        },
        select: { id: true, status: true },
      }),
    ]);

    const activeContracts = contracts.filter((c) => c.status === "ACTIVE");
    const totalVisits = activeContracts.reduce((sum, c) => sum + c.scheduledVisits.length, 0);
    const completedVisits = activeContracts.reduce(
      (sum, c) => sum + c.scheduledVisits.filter((v) => v.status === "COMPLETED").length, 0
    );
    const upcomingVisits = activeContracts.flatMap((c) =>
      c.scheduledVisits
        .filter((v) => v.status === "SCHEDULED" || v.status === "ASSIGNED")
        .map((v) => ({ ...v, restaurant: c.restaurant.name, contractId: c.id }))
    ).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()).slice(0, 5);

    const pendingRequests = requests.filter((r) =>
      ["REQUESTED", "SURVEY_SCHEDULED", "SURVEY_COMPLETED", "PROPOSAL_SENT"].includes(r.status)
    ).length;

    return NextResponse.json({
      ok: true,
      data: {
        activeContracts: activeContracts.length,
        totalContracts: contracts.length,
        totalVisits,
        completedVisits,
        pendingRequests,
        activeBreakdowns: breakdowns.filter((b) => ["REQUESTED", "ASSIGNED", "IN_PROGRESS"].includes(b.status)).length,
        upcomingVisits,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Unauthorized")) ? 401 : 500 }
    );
  }
}
