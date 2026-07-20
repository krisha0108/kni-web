import { NextRequest, NextResponse } from "next/server";
import { verifyOTP, isValidIndianPhone } from "@/server/sms/service";
import { OTPPurpose } from "@prisma/client";
import { z } from "zod";

const verifyOTPSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(6),
  purpose: z.enum([
    "LOGIN",
    "REGISTRATION",
    "PASSWORD_RESET",
    "PHONE_VERIFICATION",
    "BOOKING_CONFIRMATION",
    "CANDIDATE_VERIFICATION",
  ]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = verifyOTPSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { phone, code, purpose } = validation.data;

    // Validate phone number format
    if (!isValidIndianPhone(phone)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid Indian phone number format",
        },
        { status: 400 }
      );
    }

    // Verify OTP
    const result = await verifyOTP({
      phone,
      code,
      purpose: purpose as OTPPurpose,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "OTP verification failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "OTP verified successfully",
      data: {
        otpId: result.otpId,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
