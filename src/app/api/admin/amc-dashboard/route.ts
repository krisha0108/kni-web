import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/amc-dashboard
 * Admin AMC dashboard data
 */
export async function GET() {
  try {
    await requireAdmin();

    const [contracts, requests, visits, breakdowns] = await Promise.all([
      db.aMCContract.findMany({
        include: { restaurant: { select: { name: true } } },
      }),
      db.aMCRequest.findMany({ select: { id: true, status: true } }),
      db.aMCScheduledVisit.findMany({ select: { id: true, status: true, scheduledDate: true } }),
      db.aMCBreakdownRequest.findMany({ select: { id: true, status: true, urgency: true } }),
    ]);

    const activeContracts = contracts.filter((c) => c.status === "ACTIVE");

    // Monthly revenue estimate (active contracts * amount per cycle)
    const monthlyRevenue = activeContracts.reduce((sum, c) => {
      if (c.billingCycle === "MONTHLY") return sum + c.amountPerCycle;
      if (c.billingCycle === "QUARTERLY") return sum + Math.round(c.amountPerCycle / 3);
      if (c.billingCycle === "ANNUAL") return sum + Math.round(c.amountPerCycle / 12);
      return sum;
    }, 0);

    // Expiring in 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringContracts = activeContracts.filter(
      (c) => new Date(c.endDate) <= thirtyDaysFromNow
    ).length;

    return NextResponse.json({
      ok: true,
      data: {
        totalContracts: contracts.length,
        activeContracts: activeContracts.length,
        expiredContracts: contracts.filter((c) => c.status === "EXPIRED").length,
        pendingRequests: requests.filter((r) => r.status === "REQUESTED").length,
        inSurvey: requests.filter((r) => ["SURVEY_SCHEDULED", "SURVEY_COMPLETED"].includes(r.status)).length,
        proposalsSent: requests.filter((r) => r.status === "PROPOSAL_SENT").length,
        monthlyRevenue,
        expiringContracts,
        totalVisits: visits.length,
        completedVisits: visits.filter((v) => v.status === "COMPLETED").length,
        pendingVisits: visits.filter((v) => ["SCHEDULED", "ASSIGNED"].includes(v.status)).length,
        activeBreakdowns: breakdowns.filter((b) => ["REQUESTED", "ASSIGNED", "IN_PROGRESS"].includes(b.status)).length,
        highPriorityBreakdowns: breakdowns.filter((b) => b.urgency === "HIGH" && b.status !== "RESOLVED").length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
