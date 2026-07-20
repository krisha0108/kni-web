import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    try {
      // Try to fetch real notifications
      const searchParams = request.nextUrl.searchParams;
      const page = parseInt(searchParams.get("page") || "0");
      const pageSize = parseInt(searchParams.get("pageSize") || "50");

      const where = { userId: session.id };

      const [notifications, total] = await Promise.all([
        db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : { take: pageSize }),
        }),
        db.notification.count({ where }),
      ]);

      const mapped = notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        linkUrl: n.linkUrl,
        isRead: n.isRead,
        is_read: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }));

      return NextResponse.json({
        ok: true,
        data: page > 0 ? { items: mapped, total, page, pageSize } : mapped,
        total,
      });
    } catch (dbError) {
      console.error("Database error fetching notifications:", dbError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch notifications" }, { status: 500 });
  }
}
