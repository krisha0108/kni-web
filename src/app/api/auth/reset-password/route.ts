import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifyEmailCode } from "@/server/email-code/service";
import bcrypt from "bcrypt";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, code, newPassword } = validation.data;

    // Verify the reset code
    const result = await verifyEmailCode({
      email,
      code,
      purpose: "PASSWORD_RESET",
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { email },
      data: { passwordHash },
    });

    return NextResponse.json({
      ok: true,
      message: "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
