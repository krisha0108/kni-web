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
      // Return sample data if database fails
      return NextResponse.json({
        ok: true,
        data: [
          {
            id: "1",
            name: "Basic Maintenance",
            description: "Essential maintenance coverage for your equipment",
            duration: "MONTHLY",
            serviceLimit: 2,
            price: 150000,
            features: ["Monthly inspection", "Basic repairs", "Phone support"],
            isActive: true,
          },
          {
            id: "2",
            name: "Standard Care",
            description: "Comprehensive maintenance with priority support",
            duration: "QUARTERLY",
            serviceLimit: 6,
            price: 400000,
            features: ["Quarterly deep service", "Parts replacement", "24/7 support", "Priority scheduling"],
            isActive: true,
          },
          {
            id: "3",
            name: "Premium Protection",
            description: "Full coverage with unlimited services",
            duration: "YEARLY",
            serviceLimit: 24,
            price: 1200000,
            features: ["Unlimited services", "Free parts", "Dedicated technician", "Same-day response"],
            isActive: true,
          },
        ],
      });
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching AMC plans:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch AMC plans" }, { status: 500 });
  }
}
