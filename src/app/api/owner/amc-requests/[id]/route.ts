import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";

/**
 * GET /api/owner/amc-requests/[id]
 * Get a specific AMC request detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;

    const amcRequest = await db.aMCRequest.findFirst({
      where: { id, ownerId: session.id },
      include: {
        restaurant: { select: { id: true, name: true, city: true, address: true } },
        survey: {
          select: { id: true, status: true, scheduledDate: true, completedDate: true, overallCondition: true, engineer: { select: { name: true } } },
        },
        proposal: {
          include: { contract: { select: { id: true, contractNumber: true, status: true } } },
        },
        payment: {
          select: { id: true, paymentType: true, amount: true, screenshotUrl: true, status: true, rejectionReason: true },
        },
      },
    });

    if (!amcRequest) {
      return NextResponse.json(
        { ok: false, error: "AMC request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: amcRequest });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * DELETE /api/owner/amc-requests/[id]
 * Cancel an AMC request (only if still in REQUESTED status)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;

    const amcRequest = await db.aMCRequest.findFirst({
      where: { id, ownerId: session.id },
    });

    if (!amcRequest) {
      return NextResponse.json(
        { ok: false, error: "AMC request not found" },
        { status: 404 }
      );
    }

    if (amcRequest.status !== "REQUESTED") {
      return NextResponse.json(
        { ok: false, error: "Can only cancel requests that are in REQUESTED status" },
        { status: 400 }
      );
    }

    await db.aMCRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
