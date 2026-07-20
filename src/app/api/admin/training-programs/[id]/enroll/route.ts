import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { sendSMS } from "@/server/sms/service";
import { sendBulkEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";
import { z } from "zod";

const schema = z
  .object({
    candidateId: z.string().optional(),
    engineerUserId: z.string().optional(),
  })
  .refine((d) => !!d.candidateId !== !!d.engineerUserId, {
    message: "Provide exactly one of candidateId or engineerUserId",
  });

/**
 * POST /api/admin/training-programs/[id]/enroll
 * Enroll a candidate or engineer into a training program/seminar, respecting the seat limit
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { candidateId, engineerUserId } = validation.data;

    const program = await db.trainingProgram.findUnique({
      where: { id },
      include: { _count: { select: { attendances: true } } },
    });
    if (!program) {
      return NextResponse.json({ ok: false, error: "Training program not found" }, { status: 404 });
    }

    if (program.seatLimit && program._count.attendances >= program.seatLimit) {
      return NextResponse.json({ ok: false, error: "No seats remaining for this program" }, { status: 400 });
    }

    const existing = await db.trainingAttendance.findFirst({
      where: { trainingProgramId: id, candidateId: candidateId || undefined, engineerUserId: engineerUserId || undefined },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Already enrolled in this program" }, { status: 400 });
    }

    const attendance = await db.trainingAttendance.create({
      data: { trainingProgramId: id, candidateId: candidateId || null, engineerUserId: engineerUserId || null },
    });

    // Notify the enrolled candidate/engineer
    let phone: string | null = null;
    let email: string | null = null;
    if (candidateId) {
      const candidate = await db.candidate.findUnique({ where: { id: candidateId } });
      phone = candidate?.mobile || null;
      email = candidate?.email || null;
    } else if (engineerUserId) {
      const engineer = await db.user.findUnique({ where: { id: engineerUserId } });
      phone = engineer?.phone || null;
      email = engineer?.email || null;
    }

    const message = `You're enrolled in "${program.title}" scheduled on ${formatDateTime(program.scheduledAt)}. See you there!`;
    if (phone) {
      sendSMS({ phone, message, purpose: "TRAINING_ENROLLED" }).catch((err) =>
        console.error("Training enrollment SMS failed:", err)
      );
    }
    if (email) {
      sendBulkEmail([{ email, subject: `Enrolled: ${program.title}`, html: `<p>${message}</p>` }]).catch(
        (err) => console.error("Training enrollment email failed:", err)
      );
    }

    return NextResponse.json({ ok: true, data: attendance }, { status: 201 });
  } catch (error) {
    console.error("Enroll training error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
