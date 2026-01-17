import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/rbac";
import {
  predictMonthlyRevenue,
  analyzeChurnRisk,
  getInventoryInsights,
  getBusinessPerformanceSummary,
  getEngineerPerformanceAnalytics,
} from "@/server/analytics/service";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "summary";

    switch (type) {
      case "revenue-prediction":
        const revenuePrediction = await predictMonthlyRevenue();
        return NextResponse.json({
          ok: true,
          data: revenuePrediction,
        });

      case "churn-analysis":
        const churnAnalysis = await analyzeChurnRisk();
        return NextResponse.json({
          ok: true,
          data: churnAnalysis,
        });

      case "inventory-insights":
        const inventoryInsights = await getInventoryInsights();
        return NextResponse.json({
          ok: true,
          data: inventoryInsights,
        });

      case "performance":
        const period = searchParams.get("period") as "week" | "month" | "quarter" || "month";
        const performance = await getBusinessPerformanceSummary(period);
        return NextResponse.json({
          ok: true,
          data: performance,
        });

      case "engineer-analytics":
        const engineerAnalytics = await getEngineerPerformanceAnalytics();
        return NextResponse.json({
          ok: true,
          data: engineerAnalytics,
        });

      case "summary":
      default:
        // Get all analytics in one call
        const [revenue, churn, inventory, perf, engineers] = await Promise.all([
          predictMonthlyRevenue(),
          analyzeChurnRisk(),
          getInventoryInsights(),
          getBusinessPerformanceSummary("month"),
          getEngineerPerformanceAnalytics(),
        ]);

        return NextResponse.json({
          ok: true,
          data: {
            revenuePrediction: revenue,
            churnRisk: churn,
            criticalInventory: inventory.filter((i) => i.urgency === "CRITICAL").slice(0, 5),
            performance: perf,
            topEngineers: engineers.slice(0, 5),
          },
        });
    }
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
