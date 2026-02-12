import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/amc-surveys/[id]
 * Admin views a survey report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const survey = await db.aMCSiteSurvey.findUnique({
      where: { id },
      include: {
        engineer: { select: { id: true, name: true, email: true, phone: true } },
        request: {
          include: {
            owner: { select: { id: true, name: true, email: true, phone: true } },
            restaurant: { select: { id: true, name: true, city: true, address: true } },
          },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ ok: false, error: "Survey not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: survey });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
