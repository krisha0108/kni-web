import { NextRequest, NextResponse } from "next/server";
import { generateAndSendOTP, isValidIndianPhone } from "@/server/sms/service";
import { OTPPurpose } from "@prisma/client";
import { z } from "zod";

const sendOTPSchema = z.object({
  phone: z.string().min(10).max(15),
  purpose: z.enum([
    "LOGIN",
    "REGISTRATION",
    "PASSWORD_RESET",
    "PHONE_VERIFICATION",
    "BOOKING_CONFIRMATION",
  ]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = sendOTPSchema.safeParse(body);

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

    const { phone, purpose } = validation.data;

    // Validate phone number format
    if (!isValidIndianPhone(phone)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid Indian phone number format. Must be 10 digits starting with 6-9",
        },
        { status: 400 }
      );
    }

    // Generate and send OTP
    const result = await generateAndSendOTP({
      phone,
      purpose: purpose as OTPPurpose,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "Failed to send OTP",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "OTP sent successfully",
      data: {
        otpId: result.otpId,
      },
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
