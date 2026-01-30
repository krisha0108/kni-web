import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * POST /api/owners/save-fcm-token
 * Save FCM token for push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_owner_id, fcm_token, device_id, platform } = body;

    if (!restaurant_owner_id || !fcm_token) {
      return NextResponse.json(
        { ok: false, error: "Owner ID and FCM token are required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: restaurant_owner_id },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    // Upsert the device token
    await db.deviceToken.upsert({
      where: { token: fcm_token },
      update: {
        userId: restaurant_owner_id,
        deviceId: device_id || null,
        platform: platform || "mobile",
        isActive: true,
        lastUsed: new Date(),
      },
      create: {
        userId: restaurant_owner_id,
        token: fcm_token,
        deviceId: device_id || null,
        platform: platform || "mobile",
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "FCM token saved successfully",
    });
  } catch (error: unknown) {
    console.error("Save FCM token error:", error);

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save FCM token" },
      { status: 500 }
    );
  }
}
