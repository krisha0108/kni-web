import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

/**
 * GET /api/engineer/amc-surveys
 * Engineer sees their assigned AMC surveys
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ENGINEER") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const surveys = await db.aMCSiteSurvey.findMany({
      where: { engineerId: session.id },
      include: {
        request: {
          include: {
            owner: { select: { name: true, phone: true } },
            restaurant: { select: { name: true, city: true, address: true } },
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    });

    return NextResponse.json({ ok: true, data: surveys });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
