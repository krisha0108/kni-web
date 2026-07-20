import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * POST /api/admin/content/auto-schedule
 * Auto-publish/unpublish content based on start/end dates
 * This endpoint should be called by a cron job (e.g., every hour)
 *
 * For production, use Vercel Cron Jobs or similar service:
 * - Add to vercel.json: { "crons": [{ "path": "/api/admin/content/auto-schedule", "schedule": "0 * * * *" }] }
 * - Or use external cron service like cron-job.org
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
    let actionsLog: string[] = [];

    // Auto-deactivate sponsored content that has expired
    const sponsoredToDeactivate = await db.sponsoredContent.findMany({
      where: {
        isActive: true,
        endDate: { lt: now },
      },
    });

    if (sponsoredToDeactivate.length > 0) {
      await db.sponsoredContent.updateMany({
        where: {
          id: { in: sponsoredToDeactivate.map((s) => s.id) },
        },
        data: { isActive: false },
      });
      actionsLog.push(`Auto-deactivated ${sponsoredToDeactivate.length} sponsored content items`);
    }

    // Auto-activate sponsored content that has reached start date
    const sponsoredToActivate = await db.sponsoredContent.findMany({
      where: {
        isActive: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (sponsoredToActivate.length > 0) {
      await db.sponsoredContent.updateMany({
        where: {
          id: { in: sponsoredToActivate.map((s) => s.id) },
        },
        data: { isActive: true },
      });
      actionsLog.push(`Auto-activated ${sponsoredToActivate.length} sponsored content items`);
    }

    return NextResponse.json({
      ok: true,
      message: "Auto-scheduling completed successfully",
      timestamp: now.toISOString(),
      actions: actionsLog,
      summary: {
        sponsoredActivated: sponsoredToActivate.length,
        sponsoredDeactivated: sponsoredToDeactivate.length,
      },
    });
  } catch (error: any) {
    console.error("Auto-schedule error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/content/auto-schedule
 * Preview what would be auto-scheduled (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    const [sponsoredToActivate, sponsoredToDeactivate] =
      await Promise.all([
        db.sponsoredContent.findMany({
          where: {
            isActive: false,
            startDate: { lte: now },
            endDate: { gte: now },
          },
          select: { id: true, title: true, startDate: true, endDate: true },
        }),
        db.sponsoredContent.findMany({
          where: {
            isActive: true,
            endDate: { lt: now },
          },
          select: { id: true, title: true, endDate: true },
        }),
      ]);

    return NextResponse.json({
      ok: true,
      preview: {
        sponsoredToActivate,
        sponsoredToDeactivate,
      },
      counts: {
        sponsoredToActivate: sponsoredToActivate.length,
        sponsoredToDeactivate: sponsoredToDeactivate.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
