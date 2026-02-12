import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/engineer/amc-visits/[id]/complete
 * Engineer completes an AMC visit
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
    const { checklistJson, workNotes, photoUrls } = body;

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

    if (visit.engineerId !== session.id) {
      return NextResponse.json({ ok: false, error: "Not your visit" }, { status: 403 });
    }

    if (visit.status !== "IN_PROGRESS") {
      return NextResponse.json({ ok: false, error: "Visit must be accepted (IN_PROGRESS) before completing" }, { status: 400 });
    }

    const updated = await db.aMCScheduledVisit.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedDate: new Date(),
        checklistJson: checklistJson || null,
        workNotes: workNotes || null,
        photoUrls: photoUrls || [],
      },
    });

    // If this is a BREAKDOWN visit, update the linked breakdown request to RESOLVED
    if (visit.visitType === "BREAKDOWN") {
      await db.aMCBreakdownRequest.updateMany({
        where: { assignedVisitId: id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });
    }

    // Notify owner
    const isBreakdown = visit.visitType === "BREAKDOWN";
    await createNotification({
      userId: visit.contract.ownerId,
      title: isBreakdown ? "Breakdown Resolved" : "AMC Visit Completed",
      message: isBreakdown
        ? `Breakdown visit at "${visit.contract.restaurant.name}" has been resolved.`
        : `Preventive maintenance visit #${visit.visitNumber} at "${visit.contract.restaurant.name}" has been completed.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-contracts/${visit.contractId}`,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Complete visit error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
