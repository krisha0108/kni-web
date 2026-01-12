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
    const { token } = body;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token is required" }, { status: 400 });
    }

    // Find and deactivate the token
    const deviceToken = await db.deviceToken.findFirst({
      where: {
        token,
        userId: session.id,
      },
    });

    if (!deviceToken) {
      return NextResponse.json({ ok: false, error: "Token not found" }, { status: 404 });
    }

    await db.deviceToken.update({
      where: { id: deviceToken.id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true, data: { message: "Token unregistered successfully" } });
  } catch (error) {
    console.error("Unregister device token error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
