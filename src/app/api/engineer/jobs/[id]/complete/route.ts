import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";
import { notifyOwnerServiceCompleted, createNotificationForRole } from "@/server/notifications/service";
import { Role, NotificationType } from "@prisma/client";
import { calculateCommission } from "@/lib/commission";
import { updateAMCOnBookingComplete } from "@/server/amc/auto-update";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineerMobile(request);
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

    const engProfile = await db.engineerProfile.findUnique({ where: { userId: session.id } });

    // Also guards against double-completion, since status is "COMPLETED" once this endpoint has run.
    if (assignment.status !== "ACCEPTED" && assignment.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { ok: false, error: assignment.status === "COMPLETED" ? "Job has already been completed" : "Job must be accepted or in progress to complete" },
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

    // Calculate commission based on booking total amount and payout method
    const isSalaryBased = engProfile?.payoutMethod === "SALARY";
    const commissionAmount = isSalaryBased
      ? 0
      : calculateCommission(assignment.booking.totalAmount, assignment.commissionRate);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactionOps: any[] = [
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
      db.engineerWorkLog.upsert({
        where: { assignmentId: id },
        create: {
          assignmentId: id,
          completionNote: workNotes || "",
          proofImageUrls: proofImageUrls,
        },
        update: {
          completionNote: workNotes || "",
          proofImageUrls: proofImageUrls,
        },
      }),
      // AUTO-SYNC: Create Expense entry (mirrors the web completion route)
      db.expense.create({
        data: {
          ownerId: assignment.booking.ownerId,
          restaurantId: assignment.booking.restaurantId,
          category: "MAINTENANCE",
          amount: assignment.booking.totalAmount,
          expenseDate: new Date(),
          description: `Equipment service completed - ${(workNotes || "").substring(0, 100)}`,
        },
      }),
      // AUTO-SYNC: Create Cashbook entry (expense = cash out)
      db.cashbookEntry.create({
        data: {
          ownerId: assignment.booking.ownerId,
          restaurantId: assignment.booking.restaurantId,
          entryDate: new Date(),
          entryType: "CASH_OUT",
          amount: assignment.booking.totalAmount,
          paymentMode: "CASH",
          description: `Equipment service payment - Booking #${assignment.booking.bookingNumber ?? assignment.booking.id.substring(0, 8)}`,
          category: "MAINTENANCE",
          createdBy: assignment.booking.ownerId,
        },
      }),
    ];

    // Only create payout for commission-based engineers
    if (!isSalaryBased) {
      transactionOps.push(
        db.payout.create({
          data: {
            assignmentId: id,
            engineerId: assignment.engineerId,
            amount: commissionAmount,
            status: "PENDING",
          },
        })
      );
    }

    await db.$transaction(transactionOps);

    // Notify owner
    await notifyOwnerServiceCompleted(
      assignment.booking.ownerId,
      assignment.booking.id
    );

    // Auto-update AMC if equipment has active subscription
    await updateAMCOnBookingComplete(assignment.bookingId);

    // Notify admins for review
    await createNotificationForRole(
      Role.ADMIN,
      "Job Completed - Review Required",
      `${session.name} has completed service at ${assignment.booking.restaurant.name}. Please review and process payout.`,
      NotificationType.BOOKING,
      `/admin/bookings/${assignment.bookingId}`
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
