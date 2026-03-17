import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireOwnerMobile(request);

    try {
      const plans = await db.aMCPlan.findMany({
        where: { isActive: true },
        orderBy: { price: "asc" },
      });

      return NextResponse.json({
        ok: true,
        data: plans.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description || "",
          duration: plan.duration,
          serviceLimit: plan.serviceLimit,
          price: plan.price,
          features: plan.featuresJson || [],
          isActive: plan.isActive,
        })),
      });
    } catch (dbError) {
      console.error("Database error fetching AMC plans:", dbError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch AMC plans" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching AMC plans:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch AMC plans" }, { status: 500 });
  }
}
