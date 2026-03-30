/**
 * ============================================================================
 * ENGINEER CONFIRM DELIVERY API
 * ============================================================================
 *
 * CONFIRM DELIVERY ACTION (Engineer):
 * ------------------------------------
 * Final step in the parts request flow. Engineer confirms they have physically
 * received the dispatched part. This completes the request lifecycle.
 *
 * USE CASES:
 * - Part delivered by courier/mail
 * - Part picked up from warehouse
 * - Part handed over by admin/logistics
 *
 * FLOW:
 *
 *   ┌─────────────┐
 *   │ DISPATCHED  │ ─── [Engineer clicks Confirm Delivery] ───► ┌─────────────┐
 *   └─────────────┘                                              │  DELIVERED  │ (End)
 *                                                                └─────────────┘
 *
 * VALIDATION:
 * - Request must belong to the logged-in engineer
 * - Request status must be DISPATCHED
 * - Only dispatched parts can be marked as delivered
 *
 * POST-DELIVERY:
 * - Part is now considered in engineer's possession
 * - Can be used for service jobs
 * - May update engineer's inventory (if inventory tracking enabled)
 *
 * IMPORTANT:
 * Engineer should ONLY confirm after physically receiving the part.
 * False confirmation may cause inventory discrepancies.
 *
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";
import { PartRequestStatus } from "@prisma/client";

/**
 * POST /api/engineer-app/part-requests/:id/delivered
 *
 * Confirm physical delivery of a dispatched part.
 *
 * Validation:
 * - Only DISPATCHED requests can be marked as delivered
 * - Request must belong to the authenticated engineer
 *
 * Side Effects:
 * - Updates status to DELIVERED
 * - Records deliveredAt timestamp
 * - May update engineer's parts inventory
 *
 * Response:
 * - data: { id, status: "delivered", delivered_at }
 *
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineerMobile(request);
    const { id } = await params;

    // Find the part request
    const partRequest = await db.partRequest.findFirst({
      where: {
        id,
        engineerId: session.id,
      },
    });

    if (!partRequest) {
      return NextResponse.json(
        { ok: false, error: "Part request not found" },
        { status: 404 }
      );
    }

    // Only allow confirming delivery for dispatched requests
    if (partRequest.status !== PartRequestStatus.DISPATCHED) {
      return NextResponse.json(
        { ok: false, error: "Only dispatched requests can be marked as delivered" },
        { status: 400 }
      );
    }

    // Update the request status
    const updatedRequest = await db.partRequest.update({
      where: { id },
      data: {
        status: PartRequestStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Delivery confirmed successfully",
      data: {
        id: updatedRequest.id,
        status: updatedRequest.status.toLowerCase(),
        delivered_at: updatedRequest.deliveredAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Confirm delivery error:", error);
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
