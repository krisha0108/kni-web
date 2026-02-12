import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

/**
 * GET /api/engineer/amc-visits
 * Engineer sees their assigned AMC visits
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ENGINEER") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const visits = await db.aMCScheduledVisit.findMany({
      where: { engineerId: session.id },
      include: {
        contract: {
          include: {
            restaurant: { select: { name: true, city: true, address: true } },
            owner: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    });

    return NextResponse.json({ ok: true, data: visits });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
