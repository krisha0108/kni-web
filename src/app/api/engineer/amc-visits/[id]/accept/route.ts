import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

/**
 * POST /api/engineer/amc-visits/[id]/accept
 * Engineer accepts an assigned AMC visit → status ASSIGNED → IN_PROGRESS
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

    const visit = await db.aMCScheduledVisit.findUnique({
      where: { id },
    });

    if (!visit) {
      return NextResponse.json({ ok: false, error: "Visit not found" }, { status: 404 });
    }

    if (visit.engineerId !== session.id) {
      return NextResponse.json({ ok: false, error: "Not your visit" }, { status: 403 });
    }

    if (visit.status !== "ASSIGNED") {
      return NextResponse.json({ ok: false, error: "Visit can only be accepted when in ASSIGNED status" }, { status: 400 });
    }

    const updated = await db.aMCScheduledVisit.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Accept visit error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
