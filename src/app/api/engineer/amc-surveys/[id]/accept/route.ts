import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

/**
 * POST /api/engineer/amc-surveys/[id]/accept
 * Engineer accepts the survey assignment (SCHEDULED → IN_PROGRESS)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ENGINEER") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const survey = await db.aMCSiteSurvey.findFirst({
      where: { id, engineerId: session.id },
    });

    if (!survey) {
      return NextResponse.json({ ok: false, error: "Survey not found" }, { status: 404 });
    }

    if (survey.status !== "SCHEDULED") {
      return NextResponse.json({ ok: false, error: "Survey can only be accepted when in SCHEDULED status" }, { status: 400 });
    }

    await db.aMCSiteSurvey.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
