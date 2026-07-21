import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification, notifyRestaurantTeam } from "@/server/notifications/service";
import { NotificationType, RestaurantRole } from "@prisma/client";

/**
 * PATCH /api/admin/amc-breakdowns/[id]/assign
 * Admin assigns engineer to breakdown (creates a visit of type BREAKDOWN)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { engineerId } = body;

    if (!engineerId) {
      return NextResponse.json({ ok: false, error: "Engineer is required" }, { status: 400 });
    }

    const breakdown = await db.aMCBreakdownRequest.findUnique({
      where: { id },
      include: {
        contract: {
          include: { restaurant: { select: { name: true } } },
        },
      },
    });

    if (!breakdown) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const engineer = await db.user.findFirst({
      where: { id: engineerId, role: "ENGINEER", isActive: true, isAvailable: true },
    });
    if (!engineer) {
      return NextResponse.json({ ok: false, error: "Engineer not found, inactive, or unavailable" }, { status: 404 });
    }

    // Create a breakdown visit and update breakdown status
    const [visit] = await db.$transaction([
      db.aMCScheduledVisit.create({
        data: {
          contractId: breakdown.contractId,
          engineerId,
          visitNumber: 0, // Breakdown visits use 0
          visitType: "BREAKDOWN",
          scheduledDate: new Date(),
          status: "ASSIGNED",
        },
      }),
      db.aMCBreakdownRequest.update({
        where: { id },
        data: { status: "ASSIGNED" },
      }),
    ]);

    // Update breakdown with visit link
    await db.aMCBreakdownRequest.update({
      where: { id },
      data: { assignedVisitId: visit.id },
    });

    // Notify engineer
    await createNotification({
      userId: engineerId,
      title: "AMC Breakdown Assigned",
      message: `Breakdown at "${breakdown.contract.restaurant.name}" - ${breakdown.equipmentName}. Priority: ${breakdown.urgency}`,
      type: NotificationType.AMC,
      linkUrl: `/engineer/amc-visits`,
    });

    // Notify owner
    await createNotification({
      userId: breakdown.ownerId,
      title: "Breakdown Engineer Assigned",
      message: `An engineer has been assigned for your breakdown request at "${breakdown.contract.restaurant.name}".`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-contracts/${breakdown.contractId}`,
    });

    // Notify team members (non-blocking)
    notifyRestaurantTeam({
      restaurantId: breakdown.contract.restaurantId,
      excludeUserIds: [breakdown.ownerId],
      roles: [RestaurantRole.MANAGER],
      title: "Breakdown Engineer Assigned",
      message: `An engineer has been assigned for a breakdown request at "${breakdown.contract.restaurant.name}".`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-contracts/${breakdown.contractId}`,
    });

    return NextResponse.json({ ok: true, data: visit });
  } catch (error) {
    console.error("Assign breakdown error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
