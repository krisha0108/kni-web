import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification, notifyRestaurantTeam } from "@/server/notifications/service";
import { NotificationType, RestaurantRole } from "@prisma/client";

/**
 * PATCH /api/admin/amc-visits/[id]/assign
 * Admin assigns engineer to a visit
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

    const visit = await db.aMCScheduledVisit.findUnique({
      where: { id },
      include: {
        contract: {
          include: { restaurant: { select: { name: true } } },
        },
      },
    });

    if (!visit) {
      return NextResponse.json({ ok: false, error: "Visit not found" }, { status: 404 });
    }

    const engineer = await db.user.findFirst({
      where: { id: engineerId, role: "ENGINEER", isActive: true, isAvailable: true },
    });
    if (!engineer) {
      return NextResponse.json({ ok: false, error: "Engineer not found, inactive, or unavailable" }, { status: 404 });
    }

    const updated = await db.aMCScheduledVisit.update({
      where: { id },
      data: { engineerId, status: "ASSIGNED" },
    });

    // Notify engineer
    await createNotification({
      userId: engineerId,
      title: "AMC Visit Assigned",
      message: `You have been assigned an AMC visit at "${visit.contract.restaurant.name}" on ${new Date(visit.scheduledDate).toLocaleDateString()}.`,
      type: NotificationType.AMC,
      linkUrl: `/engineer/amc-visits`,
    });

    // Notify team members (non-blocking)
    notifyRestaurantTeam({
      restaurantId: visit.contract.restaurantId,
      excludeUserIds: [visit.contract.ownerId],
      roles: [RestaurantRole.MANAGER],
      title: "AMC Visit Engineer Assigned",
      message: `An engineer has been assigned for an AMC visit at "${visit.contract.restaurant.name}" on ${new Date(visit.scheduledDate).toLocaleDateString()}.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-contracts/${visit.contractId}`,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
