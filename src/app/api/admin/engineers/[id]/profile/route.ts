import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/engineers/[id]/profile
 * Aggregated "Technician 360" view: engineer profile + originating recruitment
 * candidate (if any) + training history + ratings + recent job assignments.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const user = await db.user.findFirst({
      where: { id, role: "ENGINEER" },
      include: { engineerProfile: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Engineer not found" }, { status: 404 });
    }

    const [candidate, ratings, stats, assignments] = await Promise.all([
      db.candidate.findUnique({
        where: { convertedUserId: id },
        include: {
          trainingAttendances: { include: { trainingProgram: true } },
          payments: true,
        },
      }),
      db.engineerRating.findMany({
        where: { engineerId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { owner: { select: { name: true } }, restaurant: { select: { name: true } } },
      }),
      db.engineerStats.findUnique({ where: { engineerId: id } }),
      db.engineerAssignment.findMany({
        where: { engineerId: id },
        orderBy: { assignedAt: "desc" },
        take: 20,
        include: { booking: { select: { id: true, status: true, totalAmount: true, restaurant: { select: { name: true } } } } },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isActive: user.isActive,
          isAvailable: user.isAvailable,
          createdAt: user.createdAt,
          engineerProfile: user.engineerProfile,
        },
        candidate,
        ratings,
        stats,
        assignments,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
