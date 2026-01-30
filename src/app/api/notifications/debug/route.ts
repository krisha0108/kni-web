import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getMobileSession } from "@/server/auth/mobile-session";
import { getSession } from "@/server/auth/session";

/**
 * GET /api/notifications/debug
 * Debug endpoint to check device tokens and notification status
 */
export async function GET(request: NextRequest) {
  try {
    // Try mobile session first, then web session
    let userId: string | null = null;

    const mobileSession = await getMobileSession(request);
    if (mobileSession) {
      userId = mobileSession.id;
    } else {
      const webSession = await getSession();
      if (webSession) {
        userId = webSession.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get device tokens
    const deviceTokens = await db.deviceToken.findMany({
      where: { userId },
      select: {
        id: true,
        token: true,
        platform: true,
        isActive: true,
        createdAt: true,
        lastUsed: true,
      },
    });

    // Get notification preferences
    const preferences = await db.notificationPreference.findUnique({
      where: { userId },
    });

    // Get recent push notification logs
    const recentLogs = await db.pushNotificationLog.findMany({
      where: { userId },
      orderBy: { sentAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        errorMessage: true,
        sentAt: true,
        fcmMessageId: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        userId,
        deviceTokens: deviceTokens.map((t) => ({
          ...t,
          token: t.token.substring(0, 30) + "...", // Truncate for security
        })),
        preferences,
        recentLogs,
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
