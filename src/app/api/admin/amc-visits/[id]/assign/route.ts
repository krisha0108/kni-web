import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

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

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
