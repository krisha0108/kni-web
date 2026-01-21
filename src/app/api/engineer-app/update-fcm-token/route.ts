import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * POST /api/engineer-app/update-fcm-token
 * Register/update FCM token for push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    const body = await request.json();
    const { fcm_token, token, deviceId } = body;

    // Support both fcm_token and token field names
    const fcmToken = fcm_token || token;

    if (!fcmToken) {
      return NextResponse.json(
        { ok: false, error: "FCM token is required" },
        { status: 400 }
      );
    }

    // Check if token already exists
    const existingToken = await db.deviceToken.findUnique({
      where: { token: fcmToken },
    });

    if (existingToken) {
      // Update existing token
      const updatedToken = await db.deviceToken.update({
        where: { token: fcmToken },
        data: {
          userId: session.id,
          isActive: true,
          lastUsed: new Date(),
          deviceId: deviceId || null,
          platform: "android", // Engineer app is primarily Android
        },
      });

      return NextResponse.json({
        ok: true,
        success: true,
        message: "FCM token updated successfully",
        data: updatedToken,
      });
    }

    // Create new token
    const deviceToken = await db.deviceToken.create({
      data: {
        userId: session.id,
        token: fcmToken,
        deviceId: deviceId || null,
        platform: "android",
        isActive: true,
      },
    });

    // Create default notification preferences if they don't exist
    const existingPrefs = await db.notificationPreference.findUnique({
      where: { userId: session.id },
    });

    if (!existingPrefs) {
      await db.notificationPreference.create({
        data: {
          userId: session.id,
          enablePush: true,
          enableEmail: true,
          enableInApp: true,
          notifyOnPayment: true,
          notifyOnBooking: true,
          notifyOnEngineer: true,
          notifyOnCompletion: true,
          notifyOnOrder: true,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      message: "FCM token registered successfully",
      data: deviceToken,
    });
  } catch (error) {
    console.error("Update FCM token error:", error);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
