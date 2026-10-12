import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * GET /api/cron/reminders
 * Daily automated reminders cron job.
 *
 * Sends the following reminders:
 * 1. Equipment warranty expiring within 30 days
 * 2. Pending payments older than 3 days
 * 3. Booking feedback reminder (2 days after completion)
 * 4. Staff salary due (last day of month)
 * 5. Marketplace payment overdue (7 days)
 *
 * Schedule: "0 9 * * *" (daily at 9 AM)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const summary = {
      warrantyExpiring: 0,
      pendingPayments: 0,
      feedbackReminders: 0,
      salaryDue: 0,
      invoiceOverdue: 0,
      followUpsDue: 0,
      errors: [] as string[],
    };

    /**
     * Helper: check if a notification with the same title + userId
     * already exists today to avoid duplicates.
     */
    async function isDuplicateToday(
      userId: string,
      title: string
    ): Promise<boolean> {
      const existing = await db.notification.findFirst({
        where: {
          userId,
          title,
          createdAt: { gte: todayStart },
        },
      });
      return !!existing;
    }

    // ─── 1. Equipment Warranty Expiring (30 days) ───────────────────────

    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringEquipment = await db.equipment.findMany({
        where: {
          deletedAt: null,
          warrantyEndDate: {
            gt: now,
            lte: thirtyDaysFromNow,
          },
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          warrantyEndDate: true,
        },
      });

      for (const equip of expiringEquipment) {
        const title = "Warranty Expiring Soon";
        if (await isDuplicateToday(equip.ownerId, title)) continue;

        const expiryDate = equip.warrantyEndDate!.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        await createNotification({
          userId: equip.ownerId,
          title,
          message: `Warranty for '${equip.name}' expires on ${expiryDate}. Consider renewal or AMC.`,
          type: NotificationType.EQUIPMENT,
          linkUrl: `/owner/equipment/${equip.id}`,
        });

        summary.warrantyExpiring++;
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Warranty expiring reminder error:", msg);
      summary.errors.push(`warrantyExpiring: ${msg}`);
    }

    // ─── 2. Pending Payments Older Than 3 Days ──────────────────────────

    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const pendingBookings = await db.serviceBooking.findMany({
        where: {
          status: "SLOT_SELECTED",
          createdAt: { lt: threeDaysAgo },
        },
        select: {
          id: true,
          ownerId: true,
          createdAt: true,
          restaurant: { select: { name: true } },
        },
      });

      for (const booking of pendingBookings) {
        const title = "Payment Pending";
        if (await isDuplicateToday(booking.ownerId, title)) continue;

        const daysPending = Math.floor(
          (now.getTime() - booking.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        await createNotification({
          userId: booking.ownerId,
          title,
          message: `Your booking for ${booking.restaurant.name} is awaiting payment for ${daysPending} days.`,
          type: NotificationType.PAYMENT,
          linkUrl: `/owner/bookings/${booking.id}`,
        });

        summary.pendingPayments++;
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Pending payment reminder error:", msg);
      summary.errors.push(`pendingPayments: ${msg}`);
    }

    // ─── 3. Booking Feedback Reminder (2 days after completion) ─────────

    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const completedBookings = await db.serviceBooking.findMany({
        where: {
          status: "COMPLETED",
          updatedAt: {
            gte: threeDaysAgo,
            lt: twoDaysAgo,
          },
          engineerRatings: {
            none: {},
          },
        },
        select: {
          id: true,
          ownerId: true,
          restaurant: { select: { name: true } },
        },
      });

      for (const booking of completedBookings) {
        const title = "Rate Your Service";
        if (await isDuplicateToday(booking.ownerId, title)) continue;

        await createNotification({
          userId: booking.ownerId,
          title,
          message: `How was your recent service at ${booking.restaurant.name}? Share your feedback.`,
          type: NotificationType.BOOKING,
          linkUrl: `/owner/bookings/${booking.id}`,
        });

        summary.feedbackReminders++;
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Feedback reminder error:", msg);
      summary.errors.push(`feedbackReminders: ${msg}`);
    }

    // ─── 4. Staff Salary Due (last day of month) ────────────────────────

    try {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isLastDayOfMonth = tomorrow.getDate() === 1;

      if (isLastDayOfMonth) {
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentYear = now.getFullYear();

        // Find restaurants with active staff who have no salary record this month
        const restaurantsWithUnpaidStaff = await db.restaurant.findMany({
          where: {
            staff: {
              some: {
                status: "ACTIVE",
                salaryRecords: {
                  none: {
                    month: currentMonth,
                    year: currentYear,
                  },
                },
              },
            },
          },
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        });

        for (const restaurant of restaurantsWithUnpaidStaff) {
          const title = "Staff Salary Due";
          if (await isDuplicateToday(restaurant.ownerId, title)) continue;

          await createNotification({
            userId: restaurant.ownerId,
            title,
            message: `Monthly staff salaries are due. Generate salary slips for ${restaurant.name}.`,
            type: NotificationType.SYSTEM,
            linkUrl: `/owner/staff/salary`,
          });

          summary.salaryDue++;
        }
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Staff salary reminder error:", msg);
      summary.errors.push(`salaryDue: ${msg}`);
    }

    // ─── 5. Invoice Overdue (7 days, marketplace payment pending) ───────

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const overduePayments = await db.marketplacePayment.findMany({
        where: {
          status: "PENDING",
          createdAt: { lt: sevenDaysAgo },
        },
        select: {
          id: true,
          ownerId: true,
          totalAmount: true,
        },
      });

      for (const payment of overduePayments) {
        const title = "Payment Overdue";
        if (await isDuplicateToday(payment.ownerId, title)) continue;

        await createNotification({
          userId: payment.ownerId,
          title,
          message: `Your marketplace payment of \u20B9${payment.totalAmount.toLocaleString("en-IN")} is overdue. Please complete the payment.`,
          type: NotificationType.PAYMENT,
          linkUrl: `/owner/marketplace`,
        });

        summary.invoiceOverdue++;
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Invoice overdue reminder error:", msg);
      summary.errors.push(`invoiceOverdue: ${msg}`);
    }

    // ─── 6. Salesman Follow-up Due Today ────────────────────────────────

    try {
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const dueFollowUps = await db.salesmanFollowUp.findMany({
        where: {
          isDone: false,
          followUpDate: { gte: todayStart, lt: tomorrowStart },
        },
        select: {
          id: true,
          salesmanId: true,
          note: true,
          inquiry: { select: { name: true, businessName: true } },
          company: { select: { name: true } },
        },
      });

      for (const followUp of dueFollowUps) {
        const targetName =
          followUp.company?.name || followUp.inquiry?.businessName || followUp.inquiry?.name || "a contact";
        const title = `Follow-up Due: ${targetName}`;
        if (await isDuplicateToday(followUp.salesmanId, title)) continue;

        await createNotification({
          userId: followUp.salesmanId,
          title,
          message: followUp.note,
          type: NotificationType.SYSTEM,
          linkUrl: `/salesman/follow-ups`,
        });

        summary.followUpsDue++;
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Salesman follow-up reminder error:", msg);
      summary.errors.push(`followUpsDue: ${msg}`);
    }

    // ─── Return Summary ─────────────────────────────────────────────────

    const totalSent =
      summary.warrantyExpiring +
      summary.pendingPayments +
      summary.feedbackReminders +
      summary.salaryDue +
      summary.invoiceOverdue +
      summary.followUpsDue;

    return NextResponse.json({
      ok: true,
      data: {
        totalSent,
        ...summary,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Reminders cron error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
