import { NextRequest, NextResponse } from "next/server";
// import { db } from "@/server/db";
// import { requireEngineerMobile } from "@/server/auth/rbac";
// import { PartRequestStatus } from "@prisma/client";

/**
 * DISABLED: Parts request flow is currently disabled
 *
 * POST /api/engineer-app/part-requests/:id/delivered
 * Confirm delivery of a part request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { ok: false, error: "Parts request feature is currently disabled" },
    { status: 503 }
  );

  /* DISABLED - Parts request flow
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
  DISABLED - Parts request flow */
}
