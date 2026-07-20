import { NextRequest, NextResponse } from "next/server";
import { verifyEmailCode } from "@/server/email-code/service";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be 6 digits"),
});

/**
 * POST /api/public/candidate-verify-email
 * Public: verifies the email code sent for candidate registration (/apply).
 * Deliberately separate from /api/auth/verify-email, which creates a User
 * session — candidates aren't logged-in users at this stage.
 */
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

    const { email, code } = validation.data;

    const result = await verifyEmailCode({ email, code, purpose: "CANDIDATE_VERIFICATION" });

    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Candidate email verify error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
