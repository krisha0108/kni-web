import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/owner/amc-breakdown
 * Owner raises a breakdown request under AMC contract
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();
    const { contractId, equipmentName, problemDesc, urgency } = body;

    if (!contractId || !equipmentName || !problemDesc) {
      return NextResponse.json(
        { ok: false, error: "Contract, equipment name, and problem description are required" },
        { status: 400 }
      );
    }

    const contract = await db.aMCContract.findFirst({
      where: { id: contractId, status: "ACTIVE" },
      include: { restaurant: { select: { id: true, name: true } } },
    });

    if (!contract) {
      return NextResponse.json({ ok: false, error: "Active contract not found" }, { status: 404 });
    }

    // RBAC: verify user has amc:create access for this restaurant
    await requireRestaurantAccess(session, contract.restaurantId, "amc:create");

    // Get actual restaurant owner ID for FK
    const ownerId = await getRestaurantOwnerId(contract.restaurantId);

    // Check free breakdown visits
    const isCovered = contract.breakdownVisitsUsed < contract.freeBreakdownVisits;

    const breakdown = await db.aMCBreakdownRequest.create({
      data: {
        contractId,
        ownerId,
        equipmentName,
        problemDesc,
        urgency: urgency || "MEDIUM",
        isCoveredByAMC: isCovered,
        freeVisitsUsed: contract.breakdownVisitsUsed,
        freeVisitsTotal: contract.freeBreakdownVisits,
      },
    });

    // If covered, increment used count
    if (isCovered) {
      await db.aMCContract.update({
        where: { id: contractId },
        data: { breakdownVisitsUsed: { increment: 1 } },
      });
    }

    // Notify admins
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: `AMC Breakdown - ${urgency || "MEDIUM"} Priority`,
        message: `Breakdown request for "${equipmentName}" at "${contract.restaurant.name}". ${isCovered ? "Covered by AMC." : "Chargeable - free visits exhausted."}`,
        type: NotificationType.AMC,
        linkUrl: `/admin/amc-requests`,
      });
    }

    return NextResponse.json({ ok: true, data: breakdown }, { status: 201 });
  } catch (error) {
    console.error("Breakdown request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Unauthorized")) ? 401 : 500 }
    );
  }
}

/**
 * GET /api/owner/amc-breakdown
 * List breakdown requests for a restaurant
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

    // RBAC: verify user has amc:read access for this restaurant
    await requireRestaurantAccess(session, restaurantId, "amc:read");

    const breakdowns = await db.aMCBreakdownRequest.findMany({
      where: {
        contract: { restaurantId },
      },
      include: {
        contract: {
          select: {
            contractNumber: true,
            restaurant: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: breakdowns });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Unauthorized")) ? 401 : 500 }
    );
  }
}
