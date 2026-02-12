import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/cron/amc-lifecycle
 * Handles AMC subscription lifecycle:
 * 1. Expire active subscriptions past their end date
 * 2. Send reminder notifications for subscriptions expiring in 7 days
 *
 * Should be called daily by a cron job.
 * Add to vercel.json: { "crons": [{ "path": "/api/cron/amc-lifecycle", "schedule": "0 8 * * *" }] }
 * Or use external cron service like cron-job.org
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret - fail closed if not configured
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    const actionsLog: string[] = [];

    // 1. Expire active AMC subscriptions that have passed their end date
    const expiredAmcs = await db.aMCSubscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: { lt: now },
      },
      include: {
        equipment: { select: { name: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    for (const amc of expiredAmcs) {
      await db.aMCSubscription.update({
        where: { id: amc.id },
        data: { status: "EXPIRED" },
      });

      const equipmentName = amc.equipment?.name || "Equipment";

      await createNotification({
        userId: amc.ownerId,
        title: "AMC Expired",
        message: `Your AMC plan "${amc.planName || "AMC"}" for "${equipmentName}" has expired. Renew now to continue maintenance coverage.`,
        type: NotificationType.AMC,
        linkUrl: `/owner/equipment/${amc.equipmentId}`,
      });

      actionsLog.push(`Expired AMC ${amc.id} for ${equipmentName} (Owner: ${amc.owner?.name})`);
    }

    // 2. Send reminder for AMCs expiring in 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringAmcs = await db.aMCSubscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          gt: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        equipment: { select: { name: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    for (const amc of expiringAmcs) {
      const daysLeft = Math.ceil(
        (amc.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const equipmentName = amc.equipment?.name || "Equipment";

      // Check if we already sent a reminder today (avoid duplicate notifications)
      const existingReminder = await db.notification.findFirst({
        where: {
          userId: amc.ownerId,
          title: "AMC Expiring Soon",
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
          linkUrl: `/owner/equipment/${amc.equipmentId}`,
        },
      });

      if (!existingReminder) {
        await createNotification({
          userId: amc.ownerId,
          title: "AMC Expiring Soon",
          message: `Your AMC plan for "${equipmentName}" is expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Renew to avoid service interruption.`,
          type: NotificationType.AMC,
          linkUrl: `/owner/equipment/${amc.equipmentId}`,
        });

        actionsLog.push(`Reminder sent for AMC ${amc.id} - ${equipmentName} (${daysLeft} days left)`);
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        expired: expiredAmcs.length,
        reminders: expiringAmcs.length,
        actions: actionsLog,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("AMC lifecycle cron error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/amc-lifecycle
 * Dry-run: Preview what the cron job would do without making changes
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [expiredCount, expiringCount, activeCount] = await Promise.all([
      db.aMCSubscription.count({
        where: { status: "ACTIVE", endDate: { lt: now } },
      }),
      db.aMCSubscription.count({
        where: { status: "ACTIVE", endDate: { gt: now, lte: sevenDaysFromNow } },
      }),
      db.aMCSubscription.count({
        where: { status: "ACTIVE", endDate: { gt: now } },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        preview: true,
        wouldExpire: expiredCount,
        wouldRemind: expiringCount,
        totalActive: activeCount,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("AMC lifecycle preview error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
