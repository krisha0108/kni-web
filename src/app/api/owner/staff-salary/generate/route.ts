import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";
import { z } from "zod";

const generateSalarySchema = z.object({
  restaurantId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

// POST /api/owner/staff-salary/generate - Generate salary for all staff for a month
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();
    const validated = generateSalarySchema.parse(body);

    // Verify restaurant access via RBAC
    await requireRestaurantAccess(session, validated.restaurantId, "staff:create");

    // Get all active staff
    const staff = await db.staff.findMany({
      where: {
        restaurantId: validated.restaurantId,
        status: "ACTIVE",
      },
    });

    if (staff.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No active staff found" },
        { status: 400 }
      );
    }

    // Check existing salaries - filter them out instead of erroring
    const existing = await db.staffSalary.findMany({
      where: {
        restaurantId: validated.restaurantId,
        month: validated.month,
        year: validated.year,
      },
      select: { staffId: true },
    });

    const existingStaffIds = new Set(existing.map((e) => e.staffId));
    const staffToGenerate = staff.filter((s) => !existingStaffIds.has(s.id));

    if (staffToGenerate.length === 0) {
      return NextResponse.json({
        ok: true,
        data: [],
        message: `All ${existing.length} staff member(s) already have salary generated for this month`,
        skipped: existing.length,
      });
    }

    // Calculate attendance-based salary for part-time staff
    const startDate = new Date(validated.year, validated.month - 1, 1);
    const endDate = new Date(validated.year, validated.month, 0);

    // Get attendance data for this month
    const attendance = await db.staffAttendance.findMany({
      where: {
        restaurantId: validated.restaurantId,
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Count days present per staff
    const daysPresent = new Map<string, number>();
    attendance.forEach((record) => {
      if (record.status === "PRESENT") {
        daysPresent.set(record.staffId, (daysPresent.get(record.staffId) || 0) + 1);
      } else if (record.status === "HALF_DAY") {
        daysPresent.set(record.staffId, (daysPresent.get(record.staffId) || 0) + 0.5);
      }
    });

    // Generate salary records for staff who don't have salary yet
    const salaryData = staffToGenerate.map((member) => {
      let basicSalary = 0;

      if (member.staffType === "FULL_TIME" || member.staffType === "CONTRACT") {
        basicSalary = member.monthlySalary || 0;
      } else if (member.staffType === "PART_TIME" && member.dailyWage) {
        const days = daysPresent.get(member.id) || 0;
        basicSalary = Math.round(member.dailyWage * days);
      }

      return {
        staffId: member.id,
        restaurantId: validated.restaurantId,
        month: validated.month,
        year: validated.year,
        basicSalary,
        allowances: 0,
        deductions: 0,
        totalPayable: basicSalary,
        totalPaid: 0,
        status: "PENDING" as const,
        generatedBy: session.id,
      };
    });

    // Create all salary records
    await db.staffSalary.createMany({
      data: salaryData,
    });

    // Fetch created records with relations
    const created = await db.staffSalary.findMany({
      where: {
        restaurantId: validated.restaurantId,
        month: validated.month,
        year: validated.year,
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            designation: true,
            staffType: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: created,
      message: `Salary generated for ${created.length} staff member(s)${existing.length > 0 ? ` (${existing.length} already had salary, skipped)` : ""}`,
      created: created.length,
      skipped: existing.length,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to generate salaries" },
      { status: error.status || 500 }
    );
  }
}
