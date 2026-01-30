import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { z } from "zod";

const createStaffSchema = z.object({
  restaurantId: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  designation: z.string().min(2, "Designation is required"),
  staffType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).default("FULL_TIME"),
  joiningDate: z.string(),
  monthlySalary: z.number().positive().optional(),
  dailyWage: z.number().positive().optional(),
});

// GET /api/owner/staff - List staff members
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const status = request.nextUrl.searchParams.get("status");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    const where: any = {
      restaurantId,
      ownerId: session.id,
    };

    if (status) {
      where.status = status;
    }

    const staff = await db.staff.findMany({
      where,
      include: {
        _count: {
          select: {
            attendance: true,
            salaryRecords: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      ok: true,
      data: staff,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch staff" },
      { status: error.status || 500 }
    );
  }
}

// POST /api/owner/staff - Create staff member
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();
    const validated = createStaffSchema.parse(body);

    // Verify restaurant ownership
    const restaurant = await db.restaurant.findFirst({
      where: {
        id: validated.restaurantId,
        ownerId: session.id,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or access denied" },
        { status: 404 }
      );
    }

    // Validate salary/wage based on staff type
    if ((validated.staffType === "FULL_TIME" || validated.staffType === "CONTRACT") && !validated.monthlySalary) {
      return NextResponse.json(
        { ok: false, error: "Monthly salary is required for full-time/contract staff" },
        { status: 400 }
      );
    }

    if (validated.staffType === "PART_TIME" && !validated.dailyWage) {
      return NextResponse.json(
        { ok: false, error: "Daily wage is required for part-time staff" },
        { status: 400 }
      );
    }

    const staff = await db.staff.create({
      data: {
        ownerId: session.id,
        restaurantId: validated.restaurantId,
        name: validated.name,
        phone: validated.phone,
        designation: validated.designation,
        staffType: validated.staffType,
        joiningDate: new Date(validated.joiningDate),
        monthlySalary: validated.monthlySalary || null,
        dailyWage: validated.dailyWage || null,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      ok: true,
      data: staff,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create staff member" },
      { status: error.status || 500 }
    );
  }
}
