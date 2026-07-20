import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const noteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty"),
});

/**
 * POST /api/admin/recruitment/[id]/notes
 * Add a recruiter note to a candidate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const validation = noteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const candidate = await db.candidate.findUnique({ where: { id } });
    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
    }

    const note = await db.candidateNote.create({
      data: { candidateId: id, authorId: admin.id, note: validation.data.note },
      include: { author: { select: { name: true } } },
    });

    await db.candidateActivityLog.create({
      data: {
        candidateId: id,
        type: "NOTE_ADDED",
        description: `Note added by ${admin.name}`,
        performedBy: admin.name,
      },
    });

    return NextResponse.json({ ok: true, data: note }, { status: 201 });
  } catch (error) {
    console.error("Add candidate note error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
