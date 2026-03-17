import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    try {
      // Try to fetch real notifications
      const notifications = await db.notification.findMany({
        where: {
          userId: session.id,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      if (notifications.length > 0) {
        return NextResponse.json({
          ok: true,
          data: notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message || n.body,
            type: n.type || "INFO",
            isRead: n.isRead || n.read || false,
            createdAt: n.createdAt?.toISOString() || new Date().toISOString(),
            metadata: n.metadata || {},
          })),
        });
      }

      // No notifications found — return empty array
      return NextResponse.json({
        ok: true,
        data: [],
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
