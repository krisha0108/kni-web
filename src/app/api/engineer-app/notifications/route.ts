import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * GET /api/engineer-app/notifications
 * Get recent notifications for engineer with limit support
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const limit = Number(searchParams.get("limit")) || 10;

    const notifications = await db.notification.findMany({
      where: {
        userId: session.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      ok: true,
      data: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        linkUrl: n.linkUrl,
        isRead: n.isRead,
        created_at: n.createdAt.toISOString(),
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get engineer notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
