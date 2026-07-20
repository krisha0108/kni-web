import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["TRAINING", "SEMINAR"]).default("TRAINING"),
  scheduledAt: z.string().min(1, "Scheduled date/time is required"),
  seatLimit: z.number().int().positive().optional(),
  materialUrls: z.array(z.string()).optional(),
});

/**
 * GET /api/admin/training-programs
 * List all training programs / seminars with attendee counts
 */
export async function GET() {
  try {
    await requireAdmin();

    const programs = await db.trainingProgram.findMany({
      orderBy: { scheduledAt: "desc" },
      include: { _count: { select: { attendances: true } } },
    });

    return NextResponse.json({ ok: true, data: programs });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * POST /api/admin/training-programs
 * Create a new training program or seminar
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, description, type, scheduledAt, seatLimit, materialUrls } = validation.data;

    const program = await db.trainingProgram.create({
      data: {
        title,
        description: description || null,
        type,
        scheduledAt: new Date(scheduledAt),
        seatLimit: seatLimit ?? null,
        materialUrls: materialUrls && materialUrls.length > 0 ? materialUrls : undefined,
      },
    });

    return NextResponse.json({ ok: true, data: program }, { status: 201 });
  } catch (error) {
    console.error("Create training program error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
