import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { sendSMS } from "@/server/sms/service";
import { sendBulkEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";
import { convertCandidateManually } from "@/server/recruitment/onboarding";
import { z } from "zod";

/**
 * GET /api/admin/recruitment/[id]
 * Get a single candidate's full profile, notes, and activity history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const candidate = await db.candidate.findUnique({
      where: { id },
      include: {
        notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
        activities: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        trainingAttendances: { include: { trainingProgram: true } },
      },
    });

    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: candidate });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "ON_HOLD", "REJECTED"],
  SHORTLISTED: ["INTERVIEW_SCHEDULED", "ON_HOLD", "REJECTED"],
  ON_HOLD: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  INTERVIEW_SCHEDULED: ["TECHNICAL_EVALUATION", "ON_HOLD", "REJECTED"],
  TECHNICAL_EVALUATION: ["APPROVED", "ON_HOLD", "REJECTED"],
  APPROVED: ["REGISTRATION_PAYMENT_PENDING"],
  REGISTRATION_PAYMENT_PENDING: ["REGISTERED_PARTNER"],
  REGISTERED_PARTNER: ["TRAINING_PENDING"],
  TRAINING_PENDING: ["ACTIVE_TECHNICIAN"],
  REJECTED: ["UNDER_REVIEW"],
};

const STATUS_MESSAGES: Record<string, { title: string; sms: string }> = {
  SHORTLISTED: {
    title: "You've been shortlisted!",
    sms: "Good news! Your application to KNI Services has been shortlisted. Our team will contact you soon.",
  },
  ON_HOLD: {
    title: "Application on hold",
    sms: "Your KNI Services application is currently on hold. We will update you soon.",
  },
  REJECTED: {
    title: "Application update",
    sms: "Thank you for applying to KNI Services. We will not be proceeding with your application at this time.",
  },
  INTERVIEW_SCHEDULED: {
    title: "Interview scheduled",
    sms: "Your interview with KNI Services has been scheduled. Our recruitment team will share details shortly.",
  },
  APPROVED: {
    title: "Application approved!",
    sms: "Congratulations! Your KNI Services application has been approved. A registration payment link will follow shortly.",
  },
  // REGISTERED_PARTNER intentionally has no entry here — that transition is
  // handled entirely by convertCandidateManually (or the real payment flow),
  // which sends the actual welcome email/SMS with real login credentials.
};

const patchSchema = z.object({
  status: z.string().optional(),
  rating: z.number().int().min(1).max(10).optional(),
  rejectionReason: z.string().optional(),
  interviewScheduledAt: z.string().optional(),
  interviewNotes: z.string().optional(),
});

/**
 * PATCH /api/admin/recruitment/[id]
 * Update candidate status and/or recruiter rating
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const validation = patchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { status, rating, rejectionReason, interviewScheduledAt, interviewNotes } = validation.data;

    if (status === "INTERVIEW_SCHEDULED" && !interviewScheduledAt) {
      return NextResponse.json(
        { ok: false, error: "interviewScheduledAt is required when scheduling an interview" },
        { status: 400 }
      );
    }

    const candidate = await db.candidate.findUnique({ where: { id } });
    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
    }

    // REGISTERED_PARTNER is normally only reached via a verified registration
    // payment (finalizeRecruitmentPayment), which is what actually creates the
    // engineer login. If admin manually drags the status here instead (e.g. a
    // waived fee), it must go through the same account-creation path — never
    // just relabel the status and send a "login details coming" message with
    // no account behind it.
    if (status === "REGISTERED_PARTNER") {
      const allowed = VALID_TRANSITIONS[candidate.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { ok: false, error: `Cannot change status from ${candidate.status} to ${status}` },
          { status: 400 }
        );
      }

      const result = await convertCandidateManually(id, admin.name);
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
      }

      if (rating !== undefined) {
        await db.candidate.update({ where: { id }, data: { rating } });
        await db.candidateActivityLog.create({
          data: {
            candidateId: id,
            type: "RATING_UPDATED",
            description: `Recruiter rating set to ${rating}/10`,
            performedBy: admin.name,
          },
        });
      }

      const updatedCandidate = await db.candidate.findUnique({ where: { id } });
      return NextResponse.json({ ok: true, data: updatedCandidate });
    }

    const data: Record<string, unknown> = {};

    if (status) {
      const allowed = VALID_TRANSITIONS[candidate.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { ok: false, error: `Cannot change status from ${candidate.status} to ${status}` },
          { status: 400 }
        );
      }
      data.status = status;
      if (status === "REJECTED") {
        data.rejectionReason = rejectionReason || "Not specified";
      }
      if (status === "INTERVIEW_SCHEDULED" && interviewScheduledAt) {
        data.interviewScheduledAt = new Date(interviewScheduledAt);
        data.interviewNotes = interviewNotes || null;
      }
    }

    if (rating !== undefined) {
      data.rating = rating;
    }

    const updated = await db.candidate.update({ where: { id }, data });

    if (status) {
      await db.candidateActivityLog.create({
        data: {
          candidateId: id,
          type: "STATUS_CHANGED",
          description: `Status changed from ${candidate.status} to ${status}`,
          fromStatus: candidate.status,
          toStatus: status as never,
          performedBy: admin.name,
        },
      });

      const notif = STATUS_MESSAGES[status];
      if (notif) {
        const smsMessage =
          status === "INTERVIEW_SCHEDULED" && data.interviewScheduledAt
            ? `${notif.sms} Scheduled for ${formatDateTime(data.interviewScheduledAt as Date)}.`
            : notif.sms;
        sendSMS({ phone: candidate.mobile, message: smsMessage, purpose: `CANDIDATE_${status}` }).catch(
          (err) => console.error("Candidate status SMS failed:", err)
        );
        if (candidate.email) {
          sendBulkEmail([
            { email: candidate.email, subject: notif.title, html: `<p>${smsMessage}</p>` },
          ]).catch((err) => console.error("Candidate status email failed:", err));
        }
      }
    }

    if (rating !== undefined) {
      await db.candidateActivityLog.create({
        data: {
          candidateId: id,
          type: "RATING_UPDATED",
          description: `Recruiter rating set to ${rating}/10`,
          performedBy: admin.name,
        },
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Update candidate error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
