import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { generateAndSendEmailCode } from "@/server/email-code/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check user exists (but don't reveal to client)
    const user = await db.user.findUnique({ where: { email } });

    if (user) {
      const result = await generateAndSendEmailCode({
        email,
        purpose: "PASSWORD_RESET",
        userName: user.name,
      });

      if (!result.success) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: 429 }
        );
      }
    }

    // Always return success (don't reveal if email exists)
    return NextResponse.json({
      ok: true,
      message: "If this email is registered, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
