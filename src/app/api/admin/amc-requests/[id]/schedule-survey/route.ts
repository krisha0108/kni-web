import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification, notifyRestaurantTeam } from "@/server/notifications/service";
import { NotificationType, RestaurantRole } from "@prisma/client";

/**
 * POST /api/admin/amc-requests/[id]/schedule-survey
 * Admin schedules a site survey for an AMC request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { engineerId, scheduledDate } = body;

    if (!engineerId || !scheduledDate) {
      return NextResponse.json(
        { ok: false, error: "Engineer and scheduled date are required" },
        { status: 400 }
      );
    }

    const amcRequest = await db.aMCRequest.findUnique({
      where: { id },
      include: { restaurant: { select: { name: true } } },
    });

    if (!amcRequest) {
      return NextResponse.json({ ok: false, error: "AMC request not found" }, { status: 404 });
    }

    if (amcRequest.status !== "REQUESTED") {
      return NextResponse.json(
        { ok: false, error: `Cannot schedule survey. Current status: ${amcRequest.status}` },
        { status: 400 }
      );
    }

    // Verify engineer exists
    const engineer = await db.user.findFirst({
      where: { id: engineerId, role: "ENGINEER", isActive: true },
    });

    if (!engineer) {
      return NextResponse.json({ ok: false, error: "Engineer not found" }, { status: 404 });
    }

    // Create survey and update request status in transaction
    const [survey] = await db.$transaction([
      db.aMCSiteSurvey.create({
        data: {
          requestId: id,
          engineerId,
          scheduledDate: new Date(scheduledDate),
        },
      }),
      db.aMCRequest.update({
        where: { id },
        data: { status: "SURVEY_SCHEDULED" },
      }),
    ]);

    // Notify owner
    await createNotification({
      userId: amcRequest.ownerId,
      title: "AMC Survey Scheduled",
      message: `A site survey has been scheduled for your AMC request at "${amcRequest.restaurant.name}" on ${new Date(scheduledDate).toLocaleDateString()}.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-requests/${id}`,
    });

    // Notify engineer
    await createNotification({
      userId: engineerId,
      title: "New AMC Survey Assigned",
      message: `You have been assigned an AMC site survey at "${amcRequest.restaurant.name}" on ${new Date(scheduledDate).toLocaleDateString()}.`,
      type: NotificationType.AMC,
      linkUrl: `/engineer/amc-surveys`,
    });

    // Notify team members (non-blocking)
    notifyRestaurantTeam({
      restaurantId: amcRequest.restaurantId,
      excludeUserIds: [amcRequest.ownerId],
      roles: [RestaurantRole.MANAGER],
      title: "AMC Survey Scheduled",
      message: `A site survey has been scheduled for "${amcRequest.restaurant.name}" on ${new Date(scheduledDate).toLocaleDateString()}.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-requests/${id}`,
    });

    return NextResponse.json({ ok: true, data: survey }, { status: 201 });
  } catch (error) {
    console.error("Schedule survey error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
