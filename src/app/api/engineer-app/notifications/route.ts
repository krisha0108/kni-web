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
    const page = parseInt(searchParams.get("page") || "0");
    const pageSize = parseInt(searchParams.get("pageSize") || searchParams.get("limit") || "20");

    const where = { userId: session.id };

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : { take: pageSize }),
      }),
      page > 0 ? db.notification.count({ where }) : Promise.resolve(-1),
    ]);

    const mapped = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      linkUrl: n.linkUrl,
      isRead: n.isRead,
      is_read: n.isRead,
      created_at: n.createdAt.toISOString(),
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      ok: true,
      data: page > 0 ? { items: mapped, total, page, pageSize } : mapped,
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
