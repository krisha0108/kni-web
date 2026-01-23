import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * PUT /api/engineer-app/notifications/[id]/read
 * Mark a notification as read
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineerMobile(request);
    const { id } = await params;

    // Check if notification belongs to user
    const notification = await db.notification.findFirst({
      where: {
        id: id,
        userId: session.id,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { ok: false, error: "Notification not found" },
        { status: 404 }
      );
    }

    // Mark as read
    const updatedNotification = await db.notification.update({
      where: { id: id },
      data: { isRead: true },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Notification marked as read",
      data: {
        id: updatedNotification.id,
        isRead: updatedNotification.isRead,
      },
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
