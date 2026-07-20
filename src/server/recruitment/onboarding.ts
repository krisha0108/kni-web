import { db } from "@/server/db";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEngineerWelcomeEmail, sendWelcomeKitEmail } from "@/lib/email";
import { sendSMS } from "@/server/sms/service";
import { generateWelcomeKit } from "@/server/pdf/welcome-kit-service";

function generateTempPassword(): string {
  // Guaranteed upper+lower+digit, matching the platform's password policy
  const random = crypto.randomBytes(6).toString("hex");
  return `Kni${random.slice(0, 4)}${random.slice(4)}9`;
}

async function generateRegistrationId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.candidate.count({ where: { registrationId: { not: null } } });
  return `TECH-${year}-${String(count + 1).padStart(5, "0")}`;
}

function skillsToText(skills: unknown): string | null {
  if (!skills || typeof skills !== "object") return null;
  const selected = Object.entries(skills as Record<string, boolean>)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return selected.length > 0 ? selected.join(", ") : null;
}

/**
 * Marks a pending RecruitmentPayment as verified and, on first success, converts the
 * candidate into a live ENGINEER User + EngineerProfile (mirroring the admin/engineers
 * creation contract exactly, so the account works immediately with ServiceEngineerApp login).
 * Idempotent: safe to call from both the client-side verify route and the webhook safety net.
 */
export async function finalizeRecruitmentPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<{ ok: boolean; alreadyProcessed?: boolean; registrationId?: string; error?: string }> {
  const alreadyByPaymentId = await db.recruitmentPayment.findFirst({
    where: { razorpayPaymentId, status: "VERIFIED" },
  });
  if (alreadyByPaymentId) {
    return { ok: true, alreadyProcessed: true };
  }

  const payment = await db.recruitmentPayment.findFirst({
    where: { razorpayOrderId, status: "PENDING" },
    include: { candidate: true },
  });

  if (!payment) {
    return { ok: false, error: "No pending recruitment payment found for this order" };
  }

  const candidate = payment.candidate;
  const registrationId = await generateRegistrationId();
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await db.$transaction(async (tx) => {
    await tx.recruitmentPayment.update({
      where: { id: payment.id },
      data: { status: "VERIFIED", razorpayPaymentId, verifiedAt: new Date() },
    });

    const user = await tx.user.create({
      data: {
        name: candidate.fullName,
        email: candidate.email,
        phone: candidate.mobile,
        passwordHash,
        role: "ENGINEER",
        isActive: true,
        engineerProfile: {
          create: {
            city: candidate.city,
            skills: skillsToText(candidate.skills),
            payoutMethod: "COMMISSION",
            commissionRate: 20,
          },
        },
      },
    });

    await tx.candidate.update({
      where: { id: candidate.id },
      data: {
        registrationId,
        convertedUserId: user.id,
        status: "REGISTERED_PARTNER",
      },
    });

    await tx.candidateActivityLog.create({
      data: {
        candidateId: candidate.id,
        type: "STATUS_CHANGED",
        description: `Payment verified — registered as ${registrationId} and converted to a live ENGINEER account`,
        fromStatus: "REGISTRATION_PAYMENT_PENDING",
        toStatus: "REGISTERED_PARTNER",
        performedBy: "System (Razorpay)",
      },
    });
  });

  sendEngineerWelcomeEmail(candidate.email, candidate.fullName, tempPassword).catch((err) =>
    console.error("Recruitment welcome email failed:", err)
  );
  sendSMS({
    phone: candidate.mobile,
    message: `Welcome to KNI Services! Your registration ${registrationId} is complete. Login details have been emailed to you.`,
    purpose: "RECRUITMENT_REGISTERED",
  }).catch((err) => console.error("Recruitment welcome SMS failed:", err));

  generateWelcomeKit(candidate.id)
    .then((pdfBuffer) => sendWelcomeKitEmail(candidate.email, candidate.fullName, registrationId, pdfBuffer))
    .catch((err) => console.error("Digital Welcome Kit email failed:", err));

  return { ok: true, registrationId };
}
