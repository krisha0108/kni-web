import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { sendBulkSMS } from "@/server/sms/service";
import { sendBulkEmail } from "@/lib/email";
import { z } from "zod";

const bulkMessageSchema = z.object({
  candidateIds: z.array(z.string()).min(1, "Select at least one candidate"),
  channel: z.enum(["SMS", "EMAIL"]),
  subject: z.string().optional(),
  message: z.string().min(1, "Message cannot be empty"),
});

/**
 * POST /api/admin/recruitment/bulk-message
 * Send the same SMS or Email to a set of selected candidates
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const validation = bulkMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { candidateIds, channel, subject, message } = validation.data;

    const candidates = await db.candidate.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, mobile: true, email: true },
    });

    let results: { recipient: string; success: boolean }[] = [];

    if (channel === "SMS") {
      const smsResults = await sendBulkSMS(
        candidates.map((c) => ({ phone: c.mobile, message })),
        "RECRUITMENT_BULK"
      );
      results = smsResults.map((r) => ({ recipient: r.phone, success: r.success }));
    } else {
      const withEmail = candidates.filter((c) => c.email);
      const emailResults = await sendBulkEmail(
        withEmail.map((c) => ({
          email: c.email as string,
          subject: subject || "Update from KNI Services",
          html: `<p>${message}</p>`,
        }))
      );
      results = emailResults.map((r) => ({ recipient: r.email, success: r.success }));
    }

    await db.candidateActivityLog.createMany({
      data: candidates.map((c) => ({
        candidateId: c.id,
        type: channel === "SMS" ? "SMS_SENT" : "EMAIL_SENT",
        description: `Bulk ${channel} sent by ${admin.name}`,
        performedBy: admin.name,
      })),
    });

    return NextResponse.json({ ok: true, data: { results } });
  } catch (error) {
    console.error("Bulk message error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
