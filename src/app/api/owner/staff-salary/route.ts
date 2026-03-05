import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";
import { z } from "zod";

const createSalarySchema = z.object({
  staffId: z.string(),
  restaurantId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  basicSalary: z.number().positive(),
  allowances: z.number().default(0),
  deductions: z.number().default(0),
});

const updatePaymentSchema = z.object({
  amountPaid: z.number().positive(),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"]).optional(),
});

// GET /api/owner/staff-salary - Get salary records
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const staffId = request.nextUrl.searchParams.get("staffId");
    const month = request.nextUrl.searchParams.get("month");
    const year = request.nextUrl.searchParams.get("year");
    const status = request.nextUrl.searchParams.get("status");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Verify restaurant access via RBAC
    await requireRestaurantAccess(session, restaurantId, "staff:read");

    const where: any = {
      restaurantId,
    };

    if (staffId) where.staffId = staffId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const salaryRecords = await db.staffSalary.findMany({
      where,
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
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      ok: true,
      data: salaryRecords,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch salary records" },
      { status: error.status || 500 }
    );
  }
}

// POST /api/owner/staff-salary - Create salary record
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();
    const validated = createSalarySchema.parse(body);

    // Verify restaurant access via RBAC
    await requireRestaurantAccess(session, validated.restaurantId, "staff:create");

    // Verify staff belongs to this restaurant
    const staff = await db.staff.findFirst({
      where: {
        id: validated.staffId,
        restaurantId: validated.restaurantId,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { ok: false, error: "Staff member not found or access denied" },
        { status: 404 }
      );
    }

    // Check if salary record already exists for this month/year
    const existing = await db.staffSalary.findUnique({
      where: {
        staffId_month_year: {
          staffId: validated.staffId,
          month: validated.month,
          year: validated.year,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Salary record already exists for this month" },
        { status: 400 }
      );
    }

    // Calculate total payable
    const basicSalary = validated.basicSalary;
    const allowances = validated.allowances;
    const deductions = validated.deductions;
    const totalPayable = basicSalary + allowances - deductions;

    const salaryRecord = await db.staffSalary.create({
      data: {
        staffId: validated.staffId,
        restaurantId: validated.restaurantId,
        month: validated.month,
        year: validated.year,
        basicSalary,
        allowances,
        deductions,
        totalPayable,
        totalPaid: 0,
        status: "PENDING",
        generatedBy: session.id,
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
      data: salaryRecord,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create salary record" },
      { status: error.status || 500 }
    );
  }
}
