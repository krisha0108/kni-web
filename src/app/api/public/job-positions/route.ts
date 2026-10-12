import { NextResponse } from "next/server";
import { db } from "@/server/db";

// GET /api/public/job-positions - Active positions for the public Careers page
export async function GET() {
  try {
    const positions = await db.jobPosition.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        department: true,
        location: true,
        employmentType: true,
        externalApplyUrl: true,
        legacyPositionValue: true,
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });

    return NextResponse.json({ ok: true, data: positions });
  } catch (error) {
    console.error("Get public job positions error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
