import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { z } from "zod";

const markAttendanceSchema = z.object({
  staffId: z.string(),
  restaurantId: z.string(),
  attendanceDate: z.string(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WEEKLY_OFF"]),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  workHours: z.number().optional(),
});

// GET /api/owner/staff-attendance - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const staffId = request.nextUrl.searchParams.get("staffId");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    const where: any = {
      restaurantId,
      staff: {
        ownerId: session.id,
      },
    };

    if (staffId) {
      where.staffId = staffId;
    }

    if (startDate && endDate) {
      where.attendanceDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const attendance = await db.staffAttendance.findMany({
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
    });

    return NextResponse.json({
      ok: true,
      data: attendance,
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
    const session = await requireOwner();
    const body = await request.json();
    const validated = markAttendanceSchema.parse(body);

    // Verify staff belongs to owner's restaurant
    const staff = await db.staff.findFirst({
      where: {
        id: validated.staffId,
        restaurantId: validated.restaurantId,
        ownerId: session.id,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { ok: false, error: "Staff member not found or access denied" },
        { status: 404 }
      );
    }

    const attendanceDate = new Date(validated.attendanceDate);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists for this date
    const existing = await db.staffAttendance.findUnique({
      where: {
        staffId_attendanceDate: {
          staffId: validated.staffId,
          attendanceDate,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Attendance already marked for this date" },
        { status: 400 }
      );
    }

    // Calculate work hours if check in/out times provided
    let workHours = validated.workHours;
    if (!workHours && validated.checkInTime && validated.checkOutTime) {
      const checkIn = new Date(validated.checkInTime);
      const checkOut = new Date(validated.checkOutTime);
      workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60); // hours
    }

    const attendance = await db.staffAttendance.create({
      data: {
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
        { ok: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to mark attendance" },
      { status: error.status || 500 }
    );
  }
}
