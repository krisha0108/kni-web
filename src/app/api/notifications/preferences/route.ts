import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get or create notification preferences
    let preferences = await db.notificationPreference.findUnique({
      where: { userId: session.id },
    });

    if (!preferences) {
      preferences = await db.notificationPreference.create({
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

    return NextResponse.json({ ok: true, data: preferences });
  } catch (error) {
    console.error("Get notification preferences error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const updateData: any = {};
    if (typeof body.enablePush === "boolean") updateData.enablePush = body.enablePush;
    if (typeof body.enableEmail === "boolean") updateData.enableEmail = body.enableEmail;
    if (typeof body.enableInApp === "boolean") updateData.enableInApp = body.enableInApp;
    if (typeof body.notifyOnPayment === "boolean") updateData.notifyOnPayment = body.notifyOnPayment;
    if (typeof body.notifyOnBooking === "boolean") updateData.notifyOnBooking = body.notifyOnBooking;
    if (typeof body.notifyOnEngineer === "boolean") updateData.notifyOnEngineer = body.notifyOnEngineer;
    if (typeof body.notifyOnCompletion === "boolean")
      updateData.notifyOnCompletion = body.notifyOnCompletion;
    if (typeof body.notifyOnOrder === "boolean") updateData.notifyOnOrder = body.notifyOnOrder;

    // Update preferences
    const preferences = await db.notificationPreference.upsert({
      where: { userId: session.id },
      update: updateData,
      create: {
        userId: session.id,
        enablePush: updateData.enablePush ?? true,
        enableEmail: updateData.enableEmail ?? true,
        enableInApp: updateData.enableInApp ?? true,
        notifyOnPayment: updateData.notifyOnPayment ?? true,
        notifyOnBooking: updateData.notifyOnBooking ?? true,
        notifyOnEngineer: updateData.notifyOnEngineer ?? true,
        notifyOnCompletion: updateData.notifyOnCompletion ?? true,
        notifyOnOrder: updateData.notifyOnOrder ?? true,
      },
    });

    return NextResponse.json({ ok: true, data: preferences });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
