import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { sendPushNotification } from "@/server/notifications/fcm-service";

/**
 * POST /api/owner/notifications/test
 * Send a test push notification to the current owner (mobile app)
 */
export async function POST(request: NextRequest) {
  try {
    console.log("📤 Test notification endpoint called");
    const session = await requireOwnerMobile(request);
    console.log("👤 User session:", session.id, session.email);

    // Send test notification
    const success = await sendPushNotification({
      userId: session.id,
      title: "Test Notification",
      body: `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
      data: {
        type: "test",
        timestamp: Date.now().toString(),
      },
      linkUrl: "/notifications",
    });
    console.log("📤 sendPushNotification result:", success);

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
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}
