import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineer } from "@/server/auth/rbac";
import { createNotificationForRole } from "@/server/notifications/service";
import { Role, NotificationType } from "@prisma/client";

/**
 * POST /api/engineer/jobs/:id/start
 * Mark a job as "in progress" by engineer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

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

    // Update booking status to indicate work has started
    await db.serviceBooking.update({
      where: { id: assignment.bookingId },
      data: { status: "ACCEPTED_BY_ENGINEER" }, // Keep same status but log the start
    });

    // Notify owner that engineer has started work
    await createNotificationForRole(
      Role.OWNER,
      "Engineer Started Work",
      `${session.name} has started working on your service request at ${assignment.booking.restaurant.name}`,
      NotificationType.BOOKING,
      `/owner/bookings/${assignment.bookingId}`,
      assignment.booking.ownerId
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
