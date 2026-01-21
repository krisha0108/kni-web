import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";
import { PartRequestStatus } from "@prisma/client";

/**
 * POST /api/engineer-app/part-requests/:id/cancel
 * Cancel a pending part request
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

    // Only allow cancelling pending requests
    if (partRequest.status !== PartRequestStatus.PENDING) {
      return NextResponse.json(
        { ok: false, error: "Only pending requests can be cancelled" },
        { status: 400 }
      );
    }

    // Update the request status
    const updatedRequest = await db.partRequest.update({
      where: { id },
      data: {
        status: PartRequestStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Part request cancelled successfully",
      data: {
        id: updatedRequest.id,
        status: updatedRequest.status.toLowerCase(),
        cancelled_at: updatedRequest.cancelledAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Cancel part request error:", error);
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
