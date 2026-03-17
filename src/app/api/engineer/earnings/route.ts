import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    // Check if this engineer is salary-based
    const engProfile = await db.engineerProfile.findUnique({
      where: { userId: session.id },
    });
    const isSalaryBased = engProfile?.payoutMethod === "SALARY";

    if (isSalaryBased) {
      // Salary-based engineers: show salary payout history
      const completedJobs = await db.engineerAssignment.count({
        where: { engineerId: session.id, status: "COMPLETED" },
      });

      const salaryPayouts = await db.salaryPayout.findMany({
        where: { engineerId: session.id },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });

      const totalSalaryPaid = salaryPayouts
        .filter((sp) => sp.status === "PAID")
        .reduce((sum, sp) => sum + sp.amount, 0);
      const totalSalaryPending = salaryPayouts
        .filter((sp) => sp.status === "PENDING")
        .reduce((sum, sp) => sum + sp.amount, 0);

      return NextResponse.json({
        ok: true,
        data: {
          payoutMethod: "SALARY",
          monthlySalary: engProfile?.monthlySalary || 0,
          payouts: [],
          salaryPayouts,
          summary: {
            totalEarnings: totalSalaryPaid + totalSalaryPending,
            paidEarnings: totalSalaryPaid,
            pendingEarnings: totalSalaryPending,
            completedJobs,
            pendingPayouts: salaryPayouts.filter((sp) => sp.status === "PENDING").length,
          },
        },
      });
    }

    // Commission-based: Get all payouts for this engineer
    const payouts = await db.payout.findMany({
      where: {
        engineerId: session.id,
      },
      include: {
        assignment: {
          include: {
            booking: {
              include: {
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
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

    // Calculate summary statistics (exclude CANCELLED payouts)
    const activePayouts = payouts.filter((p) => p.status !== "CANCELLED");
    const totalEarnings = activePayouts.reduce((sum, p) => sum + p.amount, 0);
    const paidEarnings = payouts
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingEarnings = payouts
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);

    const completedJobs = activePayouts.length;
    const pendingPayouts = payouts.filter((p) => p.status === "PENDING").length;

    return NextResponse.json({
      ok: true,
      data: {
        payoutMethod: "COMMISSION",
        payouts,
        summary: {
          totalEarnings,
          paidEarnings,
          pendingEarnings,
          completedJobs,
          pendingPayouts,
        },
      },
    });
  } catch (error) {
    console.error("Get engineer earnings error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
