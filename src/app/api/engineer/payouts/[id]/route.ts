import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * GET /api/engineer/payouts/:id
 * Get individual payout details for an engineer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineerMobile(request);
    const { id } = await params;

    // Get payout with related assignment and booking details
    const payout = await db.payout.findFirst({
      where: {
        id,
        engineerId: session.id, // Ensure payout belongs to this engineer
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
                    pincode: true,
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
            workLog: {
              include: {
                partsUsed: {
                  include: {
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
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json(
        { ok: false, error: "Payout not found" },
        { status: 404 }
      );
    }

    // Calculate additional statistics for this payout
    const response = {
      id: payout.id,
      amount: payout.amount,
      status: payout.status,
      paidAt: payout.paidAt,
      paymentNote: payout.paymentNote,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,

      // Assignment details
      assignment: {
        id: payout.assignment.id,
        status: payout.assignment.status,
        assignedAt: payout.assignment.assignedAt,
        completedAt: payout.assignment.completedAt,
        commissionRate: payout.assignment.commissionRate,
        commissionAmount: payout.assignment.commissionAmount,
      },

      // Booking details
      booking: {
        id: payout.assignment.booking.id,
        slotStartDateTime: payout.assignment.booking.slotStartDateTime,
        slotEndDateTime: payout.assignment.booking.slotEndDateTime,
        totalAmount: payout.assignment.booking.totalAmount,
        status: payout.assignment.booking.status,
        problemDescription: payout.assignment.booking.problemDescription,
        restaurant: payout.assignment.booking.restaurant,
        owner: payout.assignment.booking.owner,
        equipment: payout.assignment.booking.equipment,
        items: payout.assignment.booking.items,
      },

      // Work log details
      workLog: payout.assignment.workLog ? {
        completionNote: payout.assignment.workLog.completionNote,
        proofImageUrls: payout.assignment.workLog.proofImageUrls,
        partsUsed: payout.assignment.workLog.partsUsed,
        createdAt: payout.assignment.workLog.createdAt,
      } : null,
    };

    return NextResponse.json({
      ok: true,
      data: response,
    });
  } catch (error) {
    console.error("Get payout details error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
