import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * GET /api/service-engineer/equipment-requests
 * Get all equipment service requests (job assignments) for engineer
 * Used by mobile app dashboard to show job statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    // Get all assignments for this engineer
    const assignments = await db.engineerAssignment.findMany({
      where: {
        engineerId: session.id,
      },
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
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            equipment: {
              select: {
                id: true,
                name: true,
                serialNumber: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            items: {
              include: {
                serviceItem: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
                partItem: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
        workLog: true,
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    // Format for mobile app
    const formattedAssignments = assignments.map((assignment) => ({
      id: assignment.id,
      booking_id: assignment.bookingId,
      status: assignment.status.toLowerCase(), // PENDING -> pending, ACCEPTED -> accepted, etc.
      assigned_at: assignment.assignedAt.toISOString(),
      responded_at: assignment.respondedAt?.toISOString() || null,
      completed_at: assignment.completedAt?.toISOString() || null,
      rejection_reason: assignment.rejectionReason,
      commission_amount: assignment.commissionAmount,
      commission_rate: assignment.commissionRate,

      // Booking details
      booking: {
        id: assignment.booking.id,
        slot_start: assignment.booking.slotStartDateTime?.toISOString() || null,
        slot_end: assignment.booking.slotEndDateTime?.toISOString() || null,
        total_amount: assignment.booking.totalAmount,
        status: assignment.booking.status.toLowerCase(),
        problem_description: assignment.booking.problemDescription,
        problem_images: assignment.booking.problemImages,

        restaurant: assignment.booking.restaurant,
        owner: assignment.booking.owner,
        equipment: assignment.booking.equipment,
        items: assignment.booking.items,
      },

      work_log: assignment.workLog
        ? {
            completion_note: assignment.workLog.completionNote,
            proof_images: assignment.workLog.proofImageUrls,
            created_at: assignment.workLog.createdAt.toISOString(),
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      ok: true,
      data: formattedAssignments,
    });
  } catch (error) {
    console.error("Get equipment requests error:", error);
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
