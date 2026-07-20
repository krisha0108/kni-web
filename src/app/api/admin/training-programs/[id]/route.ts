import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

/**
 * GET /api/admin/training-programs/[id]
 * Get a training program with its enrolled attendees
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const program = await db.trainingProgram.findUnique({
      where: { id },
      include: {
        attendances: {
          orderBy: { createdAt: "desc" },
          include: {
            candidate: { select: { id: true, fullName: true, mobile: true, position: true } },
            engineerUser: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ ok: false, error: "Training program not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: program });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

const patchSchema = z.object({
  materialUrl: z.string().min(1, "materialUrl is required"),
});

/**
 * PATCH /api/admin/training-programs/[id]
 * Attach a newly-uploaded training material file to the program
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const validation = patchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const program = await db.trainingProgram.findUnique({ where: { id } });
    if (!program) {
      return NextResponse.json({ ok: false, error: "Training program not found" }, { status: 404 });
    }

    const existing = Array.isArray(program.materialUrls) ? (program.materialUrls as string[]) : [];
    const updated = await db.trainingProgram.update({
      where: { id },
      data: { materialUrls: [...existing, validation.data.materialUrl] },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Update training program error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
