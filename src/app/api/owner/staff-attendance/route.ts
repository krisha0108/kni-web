import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";
import { z } from "zod";

const markAttendanceSchema = z.object({
  staffId: z.string(),
  restaurantId: z.string(),
  attendanceDate: z.string(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WEEKLY_OFF", "HOLIDAY"]),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  workHours: z.number().optional(),
});

// GET /api/owner/staff-attendance - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const staffId = request.nextUrl.searchParams.get("staffId");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "0");
    const pageSize = parseInt(request.nextUrl.searchParams.get("pageSize") || "20");

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

    if (staffId) {
      where.staffId = staffId;
    }

    if (startDate && endDate) {
      // Parse dates explicitly to avoid timezone issues
      // startDate/endDate format: "YYYY-MM-DD"
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

      const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

      where.attendanceDate = {
        gte: start,
        lte: end,
      };
    }

    const [attendance, total] = await Promise.all([
      db.staffAttendance.findMany({
        where,
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              designation: true,
            },
          },
        },
        orderBy: [
          { attendanceDate: "desc" },
          { staff: { name: "asc" } },
        ],
        ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      db.staffAttendance.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: page > 0 ? { items: attendance, total } : attendance,
      total,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch attendance" },
      { status: error.status || 500 }
    );
  }
}

// POST /api/owner/staff-attendance - Mark attendance
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();
    const validated = markAttendanceSchema.parse(body);

    await requireRestaurantAccess(session, validated.restaurantId, "staff:update");

    // Verify staff belongs to restaurant
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

    // Parse date explicitly to avoid timezone issues
    const [year, month, day] = validated.attendanceDate.split('-').map(Number);
    const attendanceDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Calculate work hours if check in/out times provided
    let workHours = validated.workHours;
    if (!workHours && validated.checkInTime && validated.checkOutTime) {
      const checkIn = new Date(validated.checkInTime);
      const checkOut = new Date(validated.checkOutTime);
      workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60); // hours
    }

    // Use upsert to update if exists, create if not
    const attendance = await db.staffAttendance.upsert({
      where: {
        staffId_attendanceDate: {
          staffId: validated.staffId,
          attendanceDate,
        },
      },
      update: {
        status: validated.status,
        checkInTime: validated.checkInTime ? new Date(validated.checkInTime) : null,
        checkOutTime: validated.checkOutTime ? new Date(validated.checkOutTime) : null,
        workHours,
        markedBy: session.id,
      },
      create: {
        staffId: validated.staffId,
        restaurantId: validated.restaurantId,
        attendanceDate,
        status: validated.status,
        checkInTime: validated.checkInTime ? new Date(validated.checkInTime) : null,
        checkOutTime: validated.checkOutTime ? new Date(validated.checkOutTime) : null,
        workHours,
        markedBy: session.id,
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: attendance,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to mark attendance" },
      { status: error.status || 500 }
    );
  }
}
