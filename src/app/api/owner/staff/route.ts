import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";
import { z } from "zod";

const createStaffSchema = z.object({
  restaurantId: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  designation: z.string().min(2, "Designation is required"),
  staffType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).default("FULL_TIME"),
  joiningDate: z.string(),
  monthlySalary: z.number().positive().nullable().optional(),
  dailyWage: z.number().positive().nullable().optional(),
});

// GET /api/owner/staff - List staff members
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    await requireRestaurantAccess(session, restaurantId, "staff:read");

    const where: any = {
      restaurantId,
    };

    if (status) {
      where.status = status;
    }

    const [staff, total] = await Promise.all([
      db.staff.findMany({
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
        ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      page > 0 ? db.staff.count({ where }) : Promise.resolve(-1),
    ]);

    return NextResponse.json({
      ok: true,
      data: page > 0 ? { items: staff, total, page, pageSize } : staff,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch staff" },
      { status: error.message?.includes("Unauthorized") ? 401 : (error.status || 500) }
    );
  }
}

// POST /api/owner/staff - Create staff member
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();
    const validated = createStaffSchema.parse(body);

    // Verify RBAC access
    await requireRestaurantAccess(session, validated.restaurantId, "staff:create");

    // Verify restaurant exists
    const restaurant = await db.restaurant.findFirst({
      where: {
        id: validated.restaurantId,
        status: "APPROVED",
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
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

    // Use actual restaurant owner ID for FK
    const ownerId = await getRestaurantOwnerId(validated.restaurantId);

    const staff = await db.staff.create({
      data: {
        ownerId,
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
      { status: error.message?.includes("Unauthorized") ? 401 : (error.status || 500) }
    );
  }
}
