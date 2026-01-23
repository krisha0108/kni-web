import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * GET /api/engineer-app/notifications/unread-count
 * Get the count of unread notifications for the engineer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    const count = await db.notification.count({
      where: {
        userId: session.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      count: count,
      unread_count: count,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
