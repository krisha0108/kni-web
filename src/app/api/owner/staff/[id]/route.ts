import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";
import { z } from "zod";

const updateStaffSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  designation: z.string().min(2).optional(),
  staffType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "RESIGNED", "TERMINATED"]).optional(),
  monthlySalary: z.number().positive().optional().nullable(),
  dailyWage: z.number().positive().optional().nullable(),
  joiningDate: z.string().optional(),
});

// GET /api/owner/staff/[id] - Get single staff member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const staff = await db.staff.findUnique({
      where: { id },
      include: {
        attendance: {
          orderBy: {
            attendanceDate: "desc",
          },
          take: 10,
        },
        salaryRecords: {
          orderBy: [
            { year: "desc" },
            { month: "desc" },
          ],
          take: 6,
        },
      },
    });

    if (!staff) {
      return NextResponse.json(
        { ok: false, error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Validate RBAC access
    await requireRestaurantAccess(session, staff.restaurantId, "staff:read");

    return NextResponse.json({
      ok: true,
      data: staff,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch staff member" },
      { status: error.message?.includes("Unauthorized") ? 401 : (error.status || 500) }
    );
  }
}

// PATCH /api/owner/staff/[id] - Update staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;
    const body = await request.json();
    const validated = updateStaffSchema.parse(body);

    // Fetch record and check RBAC
    const existing = await db.staff.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Staff member not found" },
        { status: 404 }
      );
    }

    await requireRestaurantAccess(session, existing.restaurantId, "staff:update");

    // Changing status to TERMINATED requires staff:delete permission
    if (validated.status === "TERMINATED") {
      await requireRestaurantAccess(session, existing.restaurantId, "staff:delete");
    }

    const updateData: any = {};

    if (validated.name) updateData.name = validated.name;
    if (validated.phone) updateData.phone = validated.phone;
    if (validated.designation) updateData.designation = validated.designation;
    if (validated.staffType) updateData.staffType = validated.staffType;
    if (validated.status) updateData.status = validated.status;
    if (validated.monthlySalary !== undefined) {
      updateData.monthlySalary = validated.monthlySalary || null;
    }
    if (validated.dailyWage !== undefined) {
      updateData.dailyWage = validated.dailyWage || null;
    }
    if (validated.joiningDate) updateData.joiningDate = new Date(validated.joiningDate);

    const staff = await db.staff.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      data: staff,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Staff member not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update staff member" },
      { status: error.message?.includes("Unauthorized") ? 401 : (error.status || 500) }
    );
  }
}

// DELETE /api/owner/staff/[id] - Delete staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    // Fetch record and check RBAC
    const existing = await db.staff.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Staff member not found" },
        { status: 404 }
      );
    }

    await requireRestaurantAccess(session, existing.restaurantId, "staff:delete");

    // Instead of hard delete, mark as terminated
    await db.staff.update({
      where: { id },
      data: { status: "TERMINATED" },
    });

    return NextResponse.json({
      ok: true,
      message: "Staff member marked as terminated",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Staff member not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete staff member" },
      { status: error.message?.includes("Unauthorized") ? 401 : (error.status || 500) }
    );
  }
}
