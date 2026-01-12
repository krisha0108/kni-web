import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token, deviceId } = body;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token is required" }, { status: 400 });
    }

    // Check if token already exists
    const existingToken = await db.deviceToken.findUnique({
      where: { token },
    });

    if (existingToken) {
      // Update existing token
      const updatedToken = await db.deviceToken.update({
        where: { token },
        data: {
          userId: session.id,
          isActive: true,
          lastUsed: new Date(),
          deviceId: deviceId || null,
        },
      });

      return NextResponse.json({ ok: true, data: updatedToken });
    }

    // Create new token
    const deviceToken = await db.deviceToken.create({
      data: {
        userId: session.id,
        token,
        deviceId: deviceId || null,
        platform: "web",
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

    return NextResponse.json({ ok: true, data: deviceToken });
  } catch (error) {
    console.error("Register device token error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
