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

    // Monthly revenue estimate (each contract's total amount spread evenly
    // across its contract period, in months)
    const monthlyRevenue = activeContracts.reduce((sum, c) => {
      const months = Math.max(
        1,
        Math.round(
          (new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
      );
      return sum + Math.round(c.amount / months);
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
