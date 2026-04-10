import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const engineerId = searchParams.get("engineerId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20);

    const payoutWhere = {
      ...(status && { status: status as "PENDING" | "PAID" | "CANCELLED" }),
      ...(engineerId && { engineerId }),
    };

    // Fetch commission-based payouts with pagination
    const [payouts, payoutTotal] = await Promise.all([
      db.payout.findMany({
        where: payoutWhere,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.payout.count({ where: payoutWhere }),
    ]);

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
      data: {
        items: payouts,
        total: payoutTotal,
        page,
        pageSize,
      },
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
