import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";
import { notifyOwnerJobCompleted, createNotificationForRole, createNotification } from "@/server/notifications/service";
import { saveUploadedFile } from "@/server/upload/localUpload";
import { Role, NotificationType } from "@prisma/client";
import { rejectionReasonSchema } from "@/lib/validations/rejection";
import { calculateCommission } from "@/lib/commission";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineerMobile(request);
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
                category: { select: { id: true, name: true } },
                subCategory: { select: { id: true, name: true } },
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
    const session = await requireEngineerMobile(request);
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
    const session = await requireEngineerMobile(request);
    const { id } = await params;

    const contentType = request.headers.get("content-type") || "";

    let action: string;
    let rejectionReason: string | undefined;
    let reason: string | undefined; // Deprecated: use rejectionReason
    let completionNote: string | undefined;
    let proofImageUrls: string[] = [];
    let partsUsed: Array<{ partItemId: string; qty: number; priceSnapshot: number }> = [];
    let timeSpentSeconds: number | undefined;
    let workNotes: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      action = formData.get("action") as string;
      rejectionReason = formData.get("rejectionReason") as string | undefined;
      reason = formData.get("reason") as string | undefined;
      completionNote = formData.get("completionNote") as string | undefined;
      workNotes = formData.get("workNotes") as string | undefined;
      const timeSpentStr = formData.get("timeSpentSeconds") as string | null;
      if (timeSpentStr) {
        timeSpentSeconds = parseInt(timeSpentStr, 10);
      }
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
      const proofImageUrlsStr = formData.get("proofImageUrls") as string | null;
      if (proofImageUrlsStr) {
        try {
          proofImageUrls = JSON.parse(proofImageUrlsStr);
        } catch (e) {
          // Ignore parse error
        }
      }
      // Handle single file upload (proofImage - singular)
      const file = formData.get("proofImage") as File | null;
      if (file) {
        const result = await saveUploadedFile(file, "engineer-proof");
        proofImageUrls.push(result.url);
      }

      // Handle multiple file uploads (proofImages - plural, used by mobile app)
      const proofImages = formData.getAll("proofImages");
      for (const proofImage of proofImages) {
        if (proofImage instanceof File) {
          const result = await saveUploadedFile(proofImage, "engineer-proof");
          proofImageUrls.push(result.url);
        }
      }
    } else {
      const body = await request.json();
      action = body.action;
      rejectionReason = body.rejectionReason;
      reason = body.reason;
      completionNote = body.completionNote;
      workNotes = body.workNotes;
      partsUsed = body.partsUsed || [];
      timeSpentSeconds = body.timeSpentSeconds;
      // Accept proofImageUrls as array from JSON
      if (Array.isArray(body.proofImageUrls)) {
        proofImageUrls = body.proofImageUrls;
      } else if (typeof body.proofImageUrls === "string") {
        proofImageUrls = [body.proofImageUrls];
      }
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

      // Notify owner that engineer rejected their job
      await createNotification({
        userId: assignment.booking.ownerId,
        title: "Engineer Unavailable",
        message: `${session.name} is unable to take your service request at ${assignment.booking.restaurant.name}. Our team will assign another engineer shortly.`,
        type: NotificationType.BOOKING,
        linkUrl: "/owner/bookings/" + assignment.bookingId,
      });
    } else if (action === "complete") {
      // Check if job is in accepted or in_progress status
      if (assignment.status !== "ACCEPTED" && assignment.status !== "IN_PROGRESS") {
        return NextResponse.json(
          { ok: false, error: "Job must be accepted before completing" },
          { status: 400 }
        );
      }

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

        // Extract part names for display (before creating JobPartUsed records)
        const partsUsedNames = partsUsed.map((p) => p.partItemId);

        // Check if work log already exists (from starting work)
        const existingWorkLog = await tx.engineerWorkLog.findUnique({
          where: { assignmentId: id },
        });

        let workLog;
        if (existingWorkLog) {
          // Update existing work log with completion data
          workLog = await tx.engineerWorkLog.update({
            where: { id: existingWorkLog.id },
            data: {
              completionNote,
              workNotes: workNotes || null,
              proofImageUrls: proofImageUrls.length > 0 ? proofImageUrls : undefined,
              timeSpentSeconds: timeSpentSeconds || null,
              partsUsedNames: partsUsedNames.length > 0 ? partsUsedNames : undefined,
              completedAt: new Date(),
            },
          });
        } else {
          // Create new work log with all tracking data
          workLog = await tx.engineerWorkLog.create({
            data: {
              assignmentId: id,
              completionNote,
              workNotes: workNotes || null,
              proofImageUrls: proofImageUrls.length > 0 ? proofImageUrls : undefined,
              timeSpentSeconds: timeSpentSeconds || null,
              partsUsedNames: partsUsedNames.length > 0 ? partsUsedNames : undefined,
              completedAt: new Date(),
            },
          });
        }

        // Calculate parts cost and create JobPartUsed records
        let totalPartsCost = 0;
        if (partsUsed && partsUsed.length > 0) {
          for (const part of partsUsed) {
            // Validate partItemId exists before creating record
            const partItem = await tx.partItem.findUnique({
              where: { id: part.partItemId },
            });

            if (partItem) {
              // Use actual price from database if not provided
              const priceToUse = part.priceSnapshot > 0 ? part.priceSnapshot : partItem.price;

              await tx.jobPartUsed.create({
                data: {
                  workLogId: workLog.id,
                  partItemId: part.partItemId,
                  qty: part.qty,
                  priceSnapshot: priceToUse,
                },
              });
              totalPartsCost += priceToUse * part.qty;
            } else {
              console.warn(`Invalid partItemId: ${part.partItemId} - skipping`);
            }
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

        // Get assignment with commission rate for payout calculation
        const assignmentData = await tx.engineerAssignment.findUnique({
          where: { id },
          select: { commissionRate: true, engineerId: true },
        });

        // Calculate commission and create payout
        const commissionAmount = calculateCommission(
          booking.totalAmount,
          assignmentData?.commissionRate || 20
        );

        await tx.payout.create({
          data: {
            assignmentId: id,
            engineerId: session.id,
            amount: commissionAmount,
            status: "PENDING",
          },
        });
      });

      // Notify admins for payout review
      await createNotificationForRole(
        Role.ADMIN,
        "Job Completed - Payout Pending",
        `${session.name} has completed service at ${assignment.booking.restaurant.name}. Please review and process payout.`,
        NotificationType.BOOKING,
        `/admin/payouts`
      );

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
