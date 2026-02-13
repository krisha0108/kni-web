import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { generateAndSendEmailCode } from "@/server/email-code/service";
import { EmailCodePurpose } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  purpose: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET"]),
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

    const { email, purpose } = validation.data;

    // For PASSWORD_RESET, check user exists
    if (purpose === "PASSWORD_RESET") {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        // Don't reveal if email exists - security
        return NextResponse.json({ ok: true, message: "If this email exists, a code has been sent." });
      }
    }

    const result = await generateAndSendEmailCode({
      email,
      purpose: purpose as EmailCodePurpose,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 429 }
      );
    }

    return NextResponse.json({ ok: true, message: "Code sent successfully" });
  } catch (error) {
    console.error("Send email code error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
