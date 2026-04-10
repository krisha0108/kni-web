import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";
import { notifyOwnerEngineerStarted } from "@/server/notifications/service";

/**
 * POST /api/engineer/jobs/:id/start
 * Mark a job as "in progress" by engineer
 * Requires service PIN verification from owner
 * Body: { pin: "1234" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineerMobile(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { pin } = body;

    // Find the assignment
    const assignment = await db.engineerAssignment.findFirst({
      where: {
        id,
        engineerId: session.id,
      },
      include: {
        booking: {
          include: {
            restaurant: true,
            owner: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check if job is in accepted status
    if (assignment.status !== "ACCEPTED") {
      return NextResponse.json(
        { ok: false, error: "Job must be accepted before starting" },
        { status: 400 }
      );
    }

    // ==> PIN VERIFICATION TEMPORARILY DISABLED (client request — will re-enable later)
    // // Validate service PIN
    // if (!pin) {
    //   return NextResponse.json(
    //     { ok: false, error: "Service PIN is required to start work" },
    //     { status: 400 }
    //   );
    // }
    //
    // if (!assignment.servicePin || assignment.servicePinPurpose !== "START") {
    //   return NextResponse.json(
    //     { ok: false, error: "No active start PIN found. Please request a PIN first." },
    //     { status: 400 }
    //   );
    // }
    //
    // if (assignment.servicePinExpiresAt && new Date() > assignment.servicePinExpiresAt) {
    //   return NextResponse.json(
    //     { ok: false, error: "PIN has expired. Please request a new PIN." },
    //     { status: 400 }
    //   );
    // }
    //
    // if (assignment.servicePinAttempts >= 5) {
    //   // Clear PIN after max attempts
    //   await db.engineerAssignment.update({
    //     where: { id },
    //     data: { servicePin: null, servicePinExpiresAt: null, servicePinPurpose: null, servicePinAttempts: 0 },
    //   });
    //   return NextResponse.json(
    //     { ok: false, error: "Too many wrong attempts. Please request a new PIN." },
    //     { status: 400 }
    //   );
    // }
    //
    // if (assignment.servicePin !== pin) {
    //   await db.engineerAssignment.update({
    //     where: { id },
    //     data: { servicePinAttempts: { increment: 1 } },
    //   });
    //   return NextResponse.json(
    //     { ok: false, error: "Incorrect PIN. Please try again.", attemptsLeft: 5 - assignment.servicePinAttempts - 1 },
    //     { status: 400 }
    //   );
    // }
    //
    // // PIN is correct - clear it
    // await db.engineerAssignment.update({
    //   where: { id },
    //   data: { servicePin: null, servicePinExpiresAt: null, servicePinPurpose: null, servicePinAttempts: 0 },
    // });
    // <== END PIN VERIFICATION DISABLED

    // Update assignment status to IN_PROGRESS
    await db.engineerAssignment.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    // Create or update work log with startedAt time
    const existingWorkLog = await db.engineerWorkLog.findUnique({
      where: { assignmentId: id },
    });

    if (!existingWorkLog) {
      await db.engineerWorkLog.create({
        data: {
          assignmentId: id,
          completionNote: "", // Will be filled on completion
          startedAt: new Date(),
        },
      });
    } else if (!existingWorkLog.startedAt) {
      await db.engineerWorkLog.update({
        where: { id: existingWorkLog.id },
        data: { startedAt: new Date() },
      });
    }

    // Update booking status to indicate work has started
    await db.serviceBooking.update({
      where: { id: assignment.bookingId },
      data: { status: "IN_PROGRESS" },
    });

    // Notify owner that engineer has started work
    await notifyOwnerEngineerStarted(
      assignment.booking.ownerId,
      assignment.bookingId,
      session.name
    );

    return NextResponse.json({
      ok: true,
      message: "Job started successfully",
    });
  } catch (error) {
    console.error("Start job error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
