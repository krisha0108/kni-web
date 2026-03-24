import { NextRequest, NextResponse } from "next/server";
import { getMobileSession } from "@/server/auth/mobile-session";
import { getUnreadCount } from "@/server/notifications/service";

export async function GET(request: NextRequest) {
  try {
    const session = await getMobileSession(request);
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
