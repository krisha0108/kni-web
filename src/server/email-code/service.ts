import { db } from "@/server/db";
import { EmailCodePurpose } from "@prisma/client";
import { sendEmailVerificationCode, sendCandidateVerificationCode, sendPasswordResetCode } from "@/lib/email";

const CODE_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_SECONDS = 60;

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function generateAndSendEmailCode({
  email,
  purpose,
  userName,
}: {
  email: string;
  purpose: EmailCodePurpose;
  userName?: string;
}): Promise<{ success: boolean; error?: string }> {
  // Rate limiting: check last code sent
  const lastCode = await db.emailCode.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
  });

  if (lastCode) {
    const secondsSinceLastCode =
      (Date.now() - lastCode.createdAt.getTime()) / 1000;
    if (secondsSinceLastCode < RATE_LIMIT_SECONDS) {
      const waitSeconds = Math.ceil(RATE_LIMIT_SECONDS - secondsSinceLastCode);
      return {
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new code`,
      };
    }
  }

  const code = generate6DigitCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  // Save code to DB
  await db.emailCode.create({
    data: {
      email,
      code,
      purpose,
      expiresAt,
    },
  });

  // Send email
  try {
    const name = userName || email.split("@")[0];
    if (purpose === "EMAIL_VERIFICATION") {
      await sendEmailVerificationCode(email, name, code);
    } else if (purpose === "CANDIDATE_VERIFICATION") {
      await sendCandidateVerificationCode(email, name, code);
    } else {
      await sendPasswordResetCode(email, name, code);
    }
  } catch (error) {
    console.error("Failed to send email code:", error);
    return { success: false, error: "Failed to send email. Please try again." };
  }

  return { success: true };
}

export async function verifyEmailCode({
  email,
  code,
  purpose,
}: {
  email: string;
  code: string;
  purpose: EmailCodePurpose;
}): Promise<{ success: boolean; error?: string }> {
  // Find the latest unverified code for this email + purpose
  const emailCode = await db.emailCode.findFirst({
    where: {
      email,
      purpose,
      isVerified: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!emailCode) {
    return { success: false, error: "No verification code found. Please request a new one." };
  }

  // Check expiry
  if (emailCode.expiresAt < new Date()) {
    return { success: false, error: "Code has expired. Please request a new one." };
  }

  // Check max attempts
  if (emailCode.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: "Too many attempts. Please request a new code." };
  }

  // Increment attempts
  await db.emailCode.update({
    where: { id: emailCode.id },
    data: { attempts: emailCode.attempts + 1 },
  });

  // Verify code
  if (emailCode.code !== code) {
    const remaining = MAX_ATTEMPTS - (emailCode.attempts + 1);
    return {
      success: false,
      error: remaining > 0
        ? `Invalid code. ${remaining} attempt(s) remaining.`
        : "Too many attempts. Please request a new code.",
    };
  }

  // Mark as verified
  await db.emailCode.update({
    where: { id: emailCode.id },
    data: { isVerified: true },
  });

  return { success: true };
}
