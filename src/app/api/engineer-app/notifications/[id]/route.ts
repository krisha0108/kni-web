import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * GET /api/engineer-app/notifications/[id]
 * Get a single notification by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineerMobile(request);
    const { id } = await params;

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

    return NextResponse.json({
      ok: true,
      success: true,
      data: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        linkUrl: notification.linkUrl,
        isRead: notification.isRead,
        created_at: notification.createdAt.toISOString(),
        createdAt: notification.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get notification error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * DELETE /api/engineer-app/notifications/[id]
 * Delete a notification
 */
export async function DELETE(
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

    await db.notification.delete({
      where: { id: id },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
