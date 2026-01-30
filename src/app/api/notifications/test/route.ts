import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { sendPushNotification } from "@/server/notifications/fcm-service";

/**
 * POST /api/notifications/test
 * Send a test push notification to the current user
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.id;

    // Send test notification
    const success = await sendPushNotification({
      userId,
      title: "Test Notification",
      body: `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
      data: {
        type: "test",
        timestamp: Date.now().toString(),
      },
      linkUrl: "/notifications",
    });

    if (success) {
      return NextResponse.json({
        ok: true,
        message: "Test notification sent successfully! Check your device.",
      });
    } else {
      return NextResponse.json({
        ok: false,
        error: "Failed to send notification. Make sure you have enabled notifications and registered your device.",
      });
    }
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}
