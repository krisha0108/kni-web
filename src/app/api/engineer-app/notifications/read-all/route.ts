import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * PUT /api/engineer-app/notifications/read-all
 * Mark all notifications as read for the engineer
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    // Mark all unread notifications as read
    const result = await db.notification.updateMany({
      where: {
        userId: session.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: "All notifications marked as read",
      count: result.count,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
