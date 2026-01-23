import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * GET /api/service-engineer/reports
 * Get service reports/work logs for the engineer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    // Get work logs through engineer assignments for this engineer
    const workLogs = await db.engineerWorkLog.findMany({
      where: {
        assignment: {
          engineerId: session.id,
        },
      },
      include: {
        assignment: {
          include: {
            booking: {
              include: {
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    city: true,
                  },
                },
                equipment: {
                  select: {
                    id: true,
                    name: true,
                    serialNumber: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    const total = await db.engineerWorkLog.count({
      where: {
        assignment: {
          engineerId: session.id,
        },
      },
    });

    // Format reports
    const reports = workLogs.map((log) => ({
      id: log.id,
      booking_id: log.assignment.bookingId,
      assignment_id: log.assignmentId,
      completion_note: log.completionNote,
      proof_images: log.proofImageUrls,
      work_notes: log.workNotes,
      time_spent_seconds: log.timeSpentSeconds,
      started_at: log.startedAt?.toISOString() || null,
      completed_at: log.completedAt.toISOString(),
      created_at: log.createdAt.toISOString(),
      restaurant: log.assignment.booking.restaurant
        ? {
            id: log.assignment.booking.restaurant.id,
            name: log.assignment.booking.restaurant.name,
            address: log.assignment.booking.restaurant.address,
            city: log.assignment.booking.restaurant.city,
          }
        : null,
      equipment: log.assignment.booking.equipment
        ? {
            id: log.assignment.booking.equipment.id,
            name: log.assignment.booking.equipment.name,
            serial_number: log.assignment.booking.equipment.serialNumber,
          }
        : null,
      status: log.assignment.booking.status.toLowerCase(),
      service_date: log.assignment.booking.slotStartDateTime?.toISOString() || log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get reports error:", error);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
