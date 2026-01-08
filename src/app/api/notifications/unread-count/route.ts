import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getUnreadCount } from "@/server/notifications/service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const count = await getUnreadCount(session.id);

    return NextResponse.json({
      ok: true,
      data: { count },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
