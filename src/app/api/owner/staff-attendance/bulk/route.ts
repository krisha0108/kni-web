import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { z } from "zod";

const bulkAttendanceSchema = z.object({
  restaurantId: z.string(),
  attendanceDate: z.string(),
  records: z.array(
    z.object({
      staffId: z.string(),
      status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WEEKLY_OFF"]),
      checkInTime: z.string().optional(),
      checkOutTime: z.string().optional(),
      workHours: z.number().optional(),
    })
  ),
});

// POST /api/owner/staff-attendance/bulk - Mark attendance for multiple staff
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();
    const validated = bulkAttendanceSchema.parse(body);

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

    const attendanceDate = new Date(validated.attendanceDate);
    attendanceDate.setHours(0, 0, 0, 0);

    // Get staff IDs
    const staffIds = validated.records.map((r) => r.staffId);

    // Verify all staff belong to this restaurant
    const staff = await db.staff.findMany({
      where: {
        id: { in: staffIds },
        restaurantId: validated.restaurantId,
        ownerId: session.id,
      },
    });

    if (staff.length !== staffIds.length) {
      return NextResponse.json(
        { ok: false, error: "Some staff members not found or access denied" },
        { status: 400 }
      );
    }

    // Check for existing attendance
    const existing = await db.staffAttendance.findMany({
      where: {
        staffId: { in: staffIds },
        attendanceDate,
      },
    });

    if (existing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Attendance already marked for ${existing.length} staff member(s) on this date`,
        },
        { status: 400 }
      );
    }

    // Create attendance records
    const attendanceData = validated.records.map((record) => {
      let workHours = record.workHours;
      if (!workHours && record.checkInTime && record.checkOutTime) {
        const checkIn = new Date(record.checkInTime);
        const checkOut = new Date(record.checkOutTime);
        workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      }

      return {
        staffId: record.staffId,
        restaurantId: validated.restaurantId,
        attendanceDate,
        status: record.status,
        checkInTime: record.checkInTime ? new Date(record.checkInTime) : null,
        checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : null,
        workHours,
        markedBy: session.id,
      };
    });

    await db.staffAttendance.createMany({
      data: attendanceData,
    });

    // Fetch created records with relations
    const created = await db.staffAttendance.findMany({
      where: {
        staffId: { in: staffIds },
        attendanceDate,
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
      data: created,
      message: `Attendance marked for ${created.length} staff member(s)`,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to mark bulk attendance" },
      { status: error.status || 500 }
    );
  }
}
