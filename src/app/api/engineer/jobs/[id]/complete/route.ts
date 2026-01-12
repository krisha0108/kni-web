import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineer } from "@/server/auth/rbac";
import { notifyOwnerServiceCompleted } from "@/server/notifications/service";
import { calculateCommission } from "@/lib/commission";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

    // Verify assignment belongs to this engineer and is accepted
    const assignment = await db.engineerAssignment.findFirst({
      where: { id, engineerId: session.id },
      include: {
        booking: {
          include: { owner: true, restaurant: true },
        },
        workLog: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { ok: false, error: "Job not found" },
        { status: 404 }
      );
    }

    if (assignment.status !== "ACCEPTED") {
      return NextResponse.json(
        { ok: false, error: "Job must be accepted to complete" },
        { status: 400 }
      );
    }

    // Check if already completed
    if (assignment.workLog) {
      return NextResponse.json(
        { ok: false, error: "Job has already been completed" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { workNotes, proofImageUrls } = body;

    if (!proofImageUrls || !Array.isArray(proofImageUrls) || proofImageUrls.length === 0) {
      return NextResponse.json(
        { ok: false, error: "At least one proof image is required" },
        { status: 400 }
      );
    }

    if (proofImageUrls.length > 5) {
      return NextResponse.json(
        { ok: false, error: "Maximum 5 proof images allowed" },
        { status: 400 }
      );
    }

    // Calculate commission based on booking total amount
    const commissionAmount = calculateCommission(
      assignment.booking.totalAmount,
      assignment.commissionRate
    );

    await db.$transaction([
      db.engineerAssignment.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          commissionAmount,
        },
      }),
      db.serviceBooking.update({
        where: { id: assignment.bookingId },
        data: { status: "COMPLETED" },
      }),
      db.engineerWorkLog.create({
        data: {
          assignmentId: id,
          completionNote: workNotes || "",
          proofImageUrls: proofImageUrls,
        },
      }),
      db.payout.create({
        data: {
          assignmentId: id,
          engineerId: assignment.engineerId,
          amount: commissionAmount,
          status: "PENDING",
        },
      }),
    ]);

    // Notify owner
    await notifyOwnerServiceCompleted(
      assignment.booking.ownerId,
      assignment.booking.id
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Complete engineer job error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
