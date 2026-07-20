import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { sendSMS } from "@/server/sms/service";
import { sendBulkEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  attended: z.boolean().optional(),
  certificateUrl: z.string().optional(),
});

/**
 * PATCH /api/admin/training-programs/[id]/attendance/[attendanceId]
 * Mark attendance and/or attach a certificate for an enrolled candidate/engineer.
 * If the attendee is a candidate awaiting training, marking them attended auto-advances
 * their recruitment pipeline status to ACTIVE_TECHNICIAN.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attendanceId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { attendanceId } = await params;
    const body = await request.json();
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const attendance = await db.trainingAttendance.findUnique({
      where: { id: attendanceId },
      include: { candidate: true, trainingProgram: true },
    });
    if (!attendance) {
      return NextResponse.json({ ok: false, error: "Attendance record not found" }, { status: 404 });
    }

    const updated = await db.trainingAttendance.update({
      where: { id: attendanceId },
      data: validation.data,
    });

    if (validation.data.attended && attendance.candidate?.status === "TRAINING_PENDING") {
      await db.candidate.update({
        where: { id: attendance.candidate.id },
        data: { status: "ACTIVE_TECHNICIAN" },
      });
      await db.candidateActivityLog.create({
        data: {
          candidateId: attendance.candidate.id,
          type: "STATUS_CHANGED",
          description: `Attended "${attendance.trainingProgram.title}" — marked Active KNI Service Technician`,
          fromStatus: "TRAINING_PENDING",
          toStatus: "ACTIVE_TECHNICIAN",
          performedBy: admin.name,
        },
      });

      const msg = `Congratulations! You are now an Active KNI Service Technician after completing "${attendance.trainingProgram.title}".`;
      sendSMS({ phone: attendance.candidate.mobile, message: msg, purpose: "CANDIDATE_ACTIVE_TECHNICIAN" }).catch(
        (err) => console.error("Active technician SMS failed:", err)
      );
      sendBulkEmail([{ email: attendance.candidate.email, subject: "You're now an Active Technician!", html: `<p>${msg}</p>` }]).catch(
        (err) => console.error("Active technician email failed:", err)
      );
    }

    if (validation.data.certificateUrl) {
      const phone = attendance.candidate?.mobile;
      if (phone) {
        sendSMS({
          phone,
          message: `Your certificate for "${attendance.trainingProgram.title}" is ready.`,
          purpose: "TRAINING_CERTIFICATE_ISSUED",
        }).catch((err) => console.error("Certificate SMS failed:", err));
      }
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Update attendance error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
