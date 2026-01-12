import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { amcSubscriptionUpdateSchema } from "@/server/validators/amc";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;

    const subscription = await db.aMCSubscription.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            price: true,
            serviceLimit: true,
            featuresJson: true,
          },
        },
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
            address: true,
            city: true,
          },
        },
        usageLogs: {
          orderBy: { serviceDate: "desc" },
          take: 10,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { ok: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: subscription,
    });
  } catch (error) {
    console.error("Get AMC subscription error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;

    const body = await request.json();
    const validation = amcSubscriptionUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if subscription exists and belongs to owner
    const existingSubscription = await db.aMCSubscription.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
    });

    if (!existingSubscription) {
      return NextResponse.json(
        { ok: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (validation.data.autoRenew !== undefined) {
      updateData.autoRenew = validation.data.autoRenew;
    }
    if (validation.data.status !== undefined) {
      updateData.status = validation.data.status;
      if (validation.data.status === "CANCELLED") {
        updateData.cancelledAt = new Date();
      }
    }

    const subscription = await db.aMCSubscription.update({
      where: { id },
      data: updateData,
      include: {
        plan: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
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
