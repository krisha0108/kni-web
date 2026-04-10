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
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    await requireRestaurantAccess(session, restaurantId, "amc:read");

    const where = { restaurantId };

    const [contracts, total] = await Promise.all([
      db.aMCContract.findMany({
        where,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.aMCContract.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: contracts, total, page, pageSize },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Unauthorized")) ? 401 : 500 }
    );
  }
}
