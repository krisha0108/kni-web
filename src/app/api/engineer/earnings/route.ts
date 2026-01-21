import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    // Get all payouts for this engineer
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

    // Calculate summary statistics
    const totalEarnings = payouts.reduce((sum, p) => sum + p.amount, 0);
    const paidEarnings = payouts
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingEarnings = payouts
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);

    const completedJobs = payouts.length;
    const pendingPayouts = payouts.filter((p) => p.status === "PENDING").length;

    return NextResponse.json({
      ok: true,
      data: {
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
