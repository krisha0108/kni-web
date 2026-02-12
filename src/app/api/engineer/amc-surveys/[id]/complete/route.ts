import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/engineer/amc-surveys/[id]/complete
 * Engineer submits survey data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ENGINEER") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { equipmentList, overallCondition, specialNotes, photoUrls } = body;

    const survey = await db.aMCSiteSurvey.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            restaurant: { select: { name: true } },
          },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ ok: false, error: "Survey not found" }, { status: 404 });
    }

    if (survey.engineerId !== session.id) {
      return NextResponse.json({ ok: false, error: "Not your survey" }, { status: 403 });
    }

    if (survey.status !== "IN_PROGRESS") {
      return NextResponse.json({ ok: false, error: "Survey must be IN_PROGRESS to complete. Current status: " + survey.status }, { status: 400 });
    }

    // Update survey and request status
    const [updated] = await db.$transaction([
      db.aMCSiteSurvey.update({
        where: { id },
        data: {
          equipmentList: equipmentList || [],
          overallCondition: overallCondition || null,
          specialNotes: specialNotes || null,
          photoUrls: photoUrls || [],
          status: "COMPLETED",
          completedDate: new Date(),
        },
      }),
      db.aMCRequest.update({
        where: { id: survey.requestId },
        data: { status: "SURVEY_COMPLETED" },
      }),
    ]);

    // Notify admin about survey completion
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "AMC Survey Completed",
        message: `Site survey for "${survey.request.restaurant.name}" has been completed by engineer. Ready for proposal.`,
        type: NotificationType.AMC,
        linkUrl: `/admin/amc-requests`,
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Complete survey error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
