import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
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

    await requireRestaurantAccess(session, validated.restaurantId, "staff:update");

    // Parse date explicitly to avoid timezone issues
    const [year, month, day] = validated.attendanceDate.split('-').map(Number);
    const attendanceDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Get staff IDs
    const staffIds = validated.records.map((r) => r.staffId);

    // Verify all staff belong to this restaurant
    const staff = await db.staff.findMany({
      where: {
        id: { in: staffIds },
        restaurantId: validated.restaurantId,
      },
    });

    if (staff.length !== staffIds.length) {
      return NextResponse.json(
        { ok: false, error: "Some staff members not found or access denied" },
        { status: 400 }
      );
    }

    // Check for existing attendance - filter them out instead of erroring
    const existing = await db.staffAttendance.findMany({
      where: {
        staffId: { in: staffIds },
        attendanceDate,
      },
      select: { staffId: true },
    });

    const existingStaffIds = new Set(existing.map((e) => e.staffId));
    const recordsToCreate = validated.records.filter(
      (r) => !existingStaffIds.has(r.staffId)
    );

    if (recordsToCreate.length === 0) {
      return NextResponse.json({
        ok: true,
        data: [],
        message: "All staff members already have attendance marked for this date",
        skipped: existing.length,
      });
    }

    // Use upsert for each record to handle any race conditions
    const results = [];
    for (const record of recordsToCreate) {
      let workHours = record.workHours;
      if (!workHours && record.checkInTime && record.checkOutTime) {
        const checkIn = new Date(record.checkInTime);
        const checkOut = new Date(record.checkOutTime);
        workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      }

      const attendance = await db.staffAttendance.upsert({
        where: {
          staffId_attendanceDate: {
            staffId: record.staffId,
            attendanceDate,
          },
        },
        update: {
          status: record.status,
          checkInTime: record.checkInTime ? new Date(record.checkInTime) : null,
          checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : null,
          workHours,
          markedBy: session.id,
        },
        create: {
          staffId: record.staffId,
          restaurantId: validated.restaurantId,
          attendanceDate,
          status: record.status,
          checkInTime: record.checkInTime ? new Date(record.checkInTime) : null,
          checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : null,
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
      results.push(attendance);
    }

    return NextResponse.json({
      ok: true,
      data: results,
      message: `Attendance marked for ${results.length} staff member(s)${existing.length > 0 ? ` (${existing.length} already marked, skipped)` : ""}`,
      created: results.length,
      skipped: existing.length,
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
