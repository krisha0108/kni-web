import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/owner/amc-breakdown
 * Owner raises a breakdown request under AMC contract
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();
    const body = await request.json();
    const { contractId, equipmentName, problemDesc, urgency } = body;

    if (!contractId || !equipmentName || !problemDesc) {
      return NextResponse.json(
        { ok: false, error: "Contract, equipment name, and problem description are required" },
        { status: 400 }
      );
    }

    const contract = await db.aMCContract.findFirst({
      where: { id: contractId, ownerId: session.id, status: "ACTIVE" },
      include: { restaurant: { select: { name: true } } },
    });

    if (!contract) {
      return NextResponse.json({ ok: false, error: "Active contract not found" }, { status: 404 });
    }

    // Check free breakdown visits
    const isCovered = contract.breakdownVisitsUsed < contract.freeBreakdownVisits;

    const breakdown = await db.aMCBreakdownRequest.create({
      data: {
        contractId,
        ownerId: session.id,
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
      { status: 500 }
    );
  }
}

/**
 * GET /api/owner/amc-breakdown
 * List owner's breakdown requests
 */
export async function GET() {
  try {
    const session = await requireOwner();

    const breakdowns = await db.aMCBreakdownRequest.findMany({
      where: { ownerId: session.id },
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
      { status: 500 }
    );
  }
}
