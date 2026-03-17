import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const generateSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024).max(2100),
});

// GET: Fetch salary payouts (with filters)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status && status !== "all") where.status = status;

    const payouts = await db.salaryPayout.findMany({
      where,
      include: {
        engineer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            engineerProfile: {
              select: {
                city: true,
                monthlySalary: true,
              },
            },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    });

    // Summary
    const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = payouts
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payouts
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingCount = payouts.filter((p) => p.status === "PENDING").length;

    return NextResponse.json({
      ok: true,
      data: payouts,
      summary: { totalAmount, paidAmount, pendingAmount, pendingCount },
    });
  } catch (error) {
    console.error("Get salary payouts error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Generate salary payouts for a given month/year
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = generateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { month, year } = validation.data;

    // Get all active salary-based engineers
    const salaryEngineers = await db.user.findMany({
      where: {
        role: "ENGINEER",
        isActive: true,
        engineerProfile: { payoutMethod: "SALARY" },
      },
      include: {
        engineerProfile: {
          select: { monthlySalary: true },
        },
      },
    });

    if (salaryEngineers.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No active salary-based engineers found" },
        { status: 400 }
      );
    }

    // Check which engineers already have payouts for this month
    const existing = await db.salaryPayout.findMany({
      where: { month, year },
      select: { engineerId: true },
    });
    const existingIds = new Set(existing.map((e) => e.engineerId));

    const newEngineers = salaryEngineers.filter(
      (e) => !existingIds.has(e.id) && (e.engineerProfile?.monthlySalary ?? 0) > 0
    );

    if (newEngineers.length === 0) {
      const allExist = salaryEngineers.every((e) => existingIds.has(e.id));
      return NextResponse.json(
        { ok: false, error: allExist
          ? `Salary payouts already generated for ${month}/${year}`
          : "No eligible salary engineers found (ensure monthly salary is set)" },
        { status: 400 }
      );
    }

    // Create salary payouts
    const created = await db.salaryPayout.createMany({
      data: newEngineers.map((eng) => ({
        engineerId: eng.id,
        month,
        year,
        amount: eng.engineerProfile!.monthlySalary!,
        status: "PENDING",
      })),
    });

    return NextResponse.json({
      ok: true,
      data: { count: created.count },
      message: `Generated ${created.count} salary payout(s) for ${month}/${year}`,
    });
  } catch (error) {
    console.error("Generate salary payouts error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate salary payouts" },
      { status: 500 }
    );
  }
}
