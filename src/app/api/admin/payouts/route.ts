import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const engineerId = searchParams.get("engineerId");

    // Fetch commission-based payouts
    const payouts = await db.payout.findMany({
      where: {
        ...(status && { status: status as "PENDING" | "PAID" | "CANCELLED" }),
        ...(engineerId && { engineerId }),
      },
      include: {
        engineer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignment: {
          include: {
            booking: {
              include: {
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch salary-based engineers with their job counts
    const salaryEngineers = await db.user.findMany({
      where: {
        role: "ENGINEER",
        isActive: true,
        engineerProfile: {
          payoutMethod: "SALARY",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        engineerProfile: {
          select: {
            payoutMethod: true,
            commissionRate: true,
            monthlySalary: true,
            city: true,
          },
        },
        _count: {
          select: {
            engineerAssignments: {
              where: { status: "COMPLETED" },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Get total monthly salary cost
    const totalMonthlySalary = salaryEngineers.reduce(
      (sum, eng) => sum + (eng.engineerProfile?.monthlySalary || 0),
      0
    );

    return NextResponse.json({
      ok: true,
      data: payouts,
      salaryEngineers,
      salaryStats: {
        totalEngineers: salaryEngineers.length,
        totalMonthlySalary,
      },
    });
  } catch (error) {
    console.error("Get payouts error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
