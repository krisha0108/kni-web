import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineer, requireEngineerMobile } from "@/server/auth/rbac";
import { EngineerAssignmentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Support both web (cookie) and mobile (Bearer token) auth
    let session;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      session = await requireEngineerMobile(request);
    } else {
      session = await requireEngineer();
    }

    // W-B: Parse optional status filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: { engineerId: string; status?: EngineerAssignmentStatus } = { engineerId: session.id };
    if (status && Object.values(EngineerAssignmentStatus).includes(status as EngineerAssignmentStatus)) {
      where.status = status as EngineerAssignmentStatus;
    }

    const [assignments, total] = await Promise.all([
      db.engineerAssignment.findMany({
        where,
        include: {
          booking: {
            include: {
              restaurant: { select: { id: true, name: true, address: true, city: true } },
              owner: { select: { id: true, name: true, phone: true } },
              items: {
                include: {
                  serviceItem: { select: { id: true, name: true } },
                  partItem: { select: { id: true, name: true } },
                },
              },
            },
          },
          workLog: true,
        },
        orderBy: { assignedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.engineerAssignment.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: assignments, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get engineer jobs error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
