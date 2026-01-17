import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineer } from "@/server/auth/rbac";
import { notifyOwnerJobCompleted, createNotificationForRole } from "@/server/notifications/service";
import { saveUploadedFile } from "@/server/upload/localUpload";
import { Role, NotificationType } from "@prisma/client";
import { rejectionReasonSchema } from "@/lib/validations/rejection";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

    const assignment = await db.engineerAssignment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            restaurant: true,
            owner: { select: { id: true, name: true, phone: true, email: true } },
            items: {
              include: {
                serviceItem: true,
                partItem: true,
              },
            },
            // Include equipment details for the engineer
            equipment: {
              include: {
                equipmentType: {
                  include: {
                    category: { select: { id: true, name: true } },
                  },
                },
                // Last 3 service bookings for service history context
                serviceBookings: {
                  where: { status: "COMPLETED" },
                  orderBy: { createdAt: "desc" },
                  take: 3,
                  include: {
                    engineerAssignments: {
                      where: { status: "COMPLETED" },
                      include: {
                        workLog: {
                          select: {
                            completionNote: true,
                            createdAt: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        workLog: true,
      },
    });

    if (!assignment || assignment.engineerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: assignment });
  } catch (error) {
    console.error("Get job error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

    const body = await request.json();
    const { action } = body;

    const assignment = await db.engineerAssignment.findFirst({
      where: { id, engineerId: session.id },
      include: { booking: { include: { restaurant: true, owner: true } } },
    });

    if (!assignment) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (action === "accept") {
      if (assignment.status !== "PENDING") {
        return NextResponse.json(
          { ok: false, error: "Job is not in pending status" },
          { status: 400 }
        );
      }
      await db.engineerAssignment.update({
        where: { id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      if (assignment.status !== "PENDING") {
        return NextResponse.json(
          { ok: false, error: "Job is not in pending status" },
          { status: 400 }
        );
      }
      // DEPRECATED: Use POST method with rejectionReason instead
      return NextResponse.json(
        {
          ok: false,
          error: "Use POST /api/engineer/jobs/:id with action 'reject' and rejectionReason field",
        },
        { status: 400 }
      );
    }

    // "start" action removed - engineer can complete directly after accepting

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update job error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

    const contentType = request.headers.get("content-type") || "";
    
    let action: string;
    let rejectionReason: string | undefined;
    let reason: string | undefined; // Deprecated: use rejectionReason
    let completionNote: string | undefined;
    let proofImageUrls: string | undefined;
    let partsUsed: Array<{ partItemId: string; qty: number; priceSnapshot: number }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      action = formData.get("action") as string;
      rejectionReason = formData.get("rejectionReason") as string | undefined;
      reason = formData.get("reason") as string | undefined;
      completionNote = formData.get("completionNote") as string | undefined;
      const partsUsedStr = formData.get("partsUsed") as string | null;
      if (partsUsedStr) {
        try {
          partsUsed = JSON.parse(partsUsedStr);
        } catch (e) {
          return NextResponse.json(
            { ok: false, error: "Invalid partsUsed format" },
            { status: 400 }
          );
        }
      }
      const file = formData.get("proofImage") as File | null;
      if (file) {
        const result = await saveUploadedFile(file, "engineer-proof");
        proofImageUrls = result.url;
      }
    } else {
      const body = await request.json();
      action = body.action;
      rejectionReason = body.rejectionReason;
      reason = body.reason;
      completionNote = body.completionNote;
      partsUsed = body.partsUsed || [];
    }

    const assignment = await db.engineerAssignment.findUnique({
      where: { id },
      include: { booking: { include: { restaurant: true } } },
    });

    if (!assignment || assignment.engineerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (action === "accept") {
      await db.engineerAssignment.update({
        where: { id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      await db.serviceBooking.update({
        where: { id: assignment.bookingId },
        data: { status: "ACCEPTED_BY_ENGINEER" },
      });
    } else if (action === "reject") {
      // Support both old 'reason' and new 'rejectionReason' fields
      const rejectionReasonValue = rejectionReason || reason;

      if (!rejectionReasonValue) {
        return NextResponse.json(
          { ok: false, error: "Rejection reason is required" },
          { status: 400 }
        );
      }

      // Validate rejection reason
      const reasonValidation = rejectionReasonSchema.safeParse(rejectionReasonValue);
      if (!reasonValidation.success) {
        return NextResponse.json(
          { ok: false, error: reasonValidation.error.issues[0]?.message || "Invalid rejection reason" },
          { status: 400 }
        );
      }

      await db.engineerAssignment.update({
        where: { id },
        data: {
          status: "REJECTED",
          respondedAt: new Date(),
          rejectionReason: reasonValidation.data,
        },
      });
      await db.serviceBooking.update({
        where: { id: assignment.bookingId },
        data: { status: "REJECTED_BY_ENGINEER" },
      });
      await createNotificationForRole(
        Role.ADMIN,
        "Engineer Rejected Job",
        session.name + " rejected job at " + assignment.booking.restaurant.name + ". Reason: " + reasonValidation.data,
        NotificationType.BOOKING,
        "/admin/bookings/" + assignment.bookingId
      );
    } else if (action === "complete") {
      if (!completionNote) {
        return NextResponse.json(
          { ok: false, error: "Completion note is required" },
          { status: 400 }
        );
      }

      // Start transaction for completion
      await db.$transaction(async (tx) => {
        // Get booking details with items for total cost calculation
        const booking = await tx.serviceBooking.findUnique({
          where: { id: assignment.bookingId },
          include: {
            restaurant: true,
            owner: true,
            items: {
              include: {
                serviceItem: true,
                partItem: true,
              },
            },
          },
        });

        if (!booking) {
          throw new Error("Booking not found");
        }

        // Create work log
        const workLog = await tx.engineerWorkLog.create({
          data: {
            assignmentId: id,
            completionNote,
            ...(proofImageUrls && { proofImageUrls }),
          },
        });

        // Calculate parts cost and create JobPartUsed records
        let totalPartsCost = 0;
        if (partsUsed && partsUsed.length > 0) {
          for (const part of partsUsed) {
            await tx.jobPartUsed.create({
              data: {
                workLogId: workLog.id,
                partItemId: part.partItemId,
                qty: part.qty,
                priceSnapshot: part.priceSnapshot,
              },
            });
            totalPartsCost += part.priceSnapshot * part.qty;
          }
        }

        // Calculate total expense (service booking amount + parts used)
        const totalExpense = booking.totalAmount + totalPartsCost;

        // AUTO-SYNC: Create Expense entry
        await tx.expense.create({
          data: {
            ownerId: booking.ownerId,
            restaurantId: booking.restaurantId,
            category: "MAINTENANCE",
            amount: totalExpense,
            expenseDate: new Date(),
            description: `Equipment service completed - ${completionNote.substring(0, 100)}${
              partsUsed.length > 0 ? ` (+ ${partsUsed.length} parts used)` : ""
            }`,
          },
        });

        // AUTO-SYNC: Create Cashbook entry (expense = cash out)
        await tx.cashbookEntry.create({
          data: {
            ownerId: booking.ownerId,
            restaurantId: booking.restaurantId,
            entryDate: new Date(),
            entryType: "CASH_OUT", // Expense is cash out
            amount: totalExpense,
            paymentMode: "CASH", // Default to cash, ideally get from payment proof
            description: `Equipment service payment - Booking #${booking.id.substring(0, 8)}`,
            category: "MAINTENANCE",
            createdBy: booking.ownerId, // Required field
          },
        });

        // Update assignment and booking status
        await tx.engineerAssignment.update({
          where: { id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });

        await tx.serviceBooking.update({
          where: { id: assignment.bookingId },
          data: { status: "COMPLETED" },
        });
      });

      // Send notification outside transaction
      await notifyOwnerJobCompleted(assignment.booking.ownerId, assignment.bookingId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Job action error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
