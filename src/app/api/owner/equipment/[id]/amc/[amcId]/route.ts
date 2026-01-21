import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { amcSubscriptionUpdateSchema } from "@/server/validators/amc";

// GET /api/owner/equipment/[id]/amc/[amcId] - Get specific AMC subscription
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; amcId: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: equipmentId, amcId } = await params;

    const subscription = await db.aMCSubscription.findFirst({
      where: {
        id: amcId,
        equipmentId,
        ownerId: session.id,
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            category: true,
            serialNumber: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        usageLogs: {
          orderBy: { serviceDate: "desc" },
          take: 20,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { ok: false, error: "AMC subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: subscription });
  } catch (error) {
    console.error("Get AMC subscription error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// PATCH /api/owner/equipment/[id]/amc/[amcId] - Update AMC subscription
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; amcId: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: equipmentId, amcId } = await params;

    const body = await request.json();
    const validation = amcSubscriptionUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db.aMCSubscription.findFirst({
      where: {
        id: amcId,
        equipmentId,
        ownerId: session.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "AMC subscription not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (validation.data.autoRenew !== undefined) {
      updateData.autoRenew = validation.data.autoRenew;
    }

    if (validation.data.status) {
      updateData.status = validation.data.status;
      if (validation.data.status === "CANCELLED") {
        updateData.cancelledAt = new Date();
      }
    }

    if (validation.data.servicesUsed !== undefined) {
      updateData.servicesUsed = validation.data.servicesUsed;
    }

    const subscription = await db.aMCSubscription.update({
      where: { id: amcId },
      data: updateData,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: subscription });
  } catch (error) {
    console.error("Update AMC subscription error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/owner/equipment/[id]/amc/[amcId] - Cancel AMC subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; amcId: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: equipmentId, amcId } = await params;

    // Verify ownership
    const existing = await db.aMCSubscription.findFirst({
      where: {
        id: amcId,
        equipmentId,
        ownerId: session.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "AMC subscription not found" },
        { status: 404 }
      );
    }

    await db.aMCSubscription.update({
      where: { id: amcId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        autoRenew: false,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "AMC subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel AMC subscription error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
