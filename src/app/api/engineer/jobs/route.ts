import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    const assignments = await db.engineerAssignment.findMany({
      where: { engineerId: session.id },
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
    });

    return NextResponse.json({ ok: true, data: assignments });
  } catch (error) {
    console.error("Get engineer jobs error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
