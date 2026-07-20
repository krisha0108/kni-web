import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { amcSubscriptionUpdateSchema } from "@/server/validators/amc";
import { z } from "zod";

const logServiceSchema = z.object({
  serviceDate: z.string().datetime("Invalid date format"),
  serviceType: z.string().min(2, "Service type must be at least 2 characters"),
  notes: z.string().optional(),
});

// POST /api/owner/equipment/[id]/amc/[amcId] - Log a service use for AMC
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; amcId: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: equipmentId, amcId } = await params;

    const body = await request.json();
    const validation = logServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const equipment = await db.equipment.findFirst({
      where: { id: equipmentId, deletedAt: null },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    await requireRestaurantAccess(session, equipment.restaurantId, "amc:update");

    const subscription = await db.aMCSubscription.findFirst({
      where: {
        id: amcId,
        equipmentId,
        status: "ACTIVE",
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { ok: false, error: "Active AMC subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.serviceLimit > 0 && subscription.servicesUsed >= subscription.serviceLimit) {
      return NextResponse.json(
        { ok: false, error: "Service limit reached for this AMC" },
        { status: 400 }
      );
    }

    const [serviceUse] = await db.$transaction([
      db.aMCServiceUse.create({
        data: {
          subscriptionId: amcId,
          serviceDate: new Date(validation.data.serviceDate),
          serviceType: validation.data.serviceType,
          notes: validation.data.notes || null,
        },
      }),
      db.aMCSubscription.update({
        where: { id: amcId },
        data: { servicesUsed: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true, data: serviceUse });
  } catch (error) {
    console.error("Log AMC service error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// GET /api/owner/equipment/[id]/amc/[amcId] - Get specific AMC subscription
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; amcId: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: equipmentId, amcId } = await params;

    // Verify equipment exists and get restaurantId for RBAC
    const equipment = await db.equipment.findFirst({
      where: { id: equipmentId, deletedAt: null },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // RBAC check - verify user has access to read AMC for this equipment's restaurant
    await requireRestaurantAccess(session, equipment.restaurantId, "amc:read");

    const subscription = await db.aMCSubscription.findFirst({
      where: {
        id: amcId,
        equipmentId,
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

    // Verify equipment exists and get restaurantId for RBAC
    const equipment = await db.equipment.findFirst({
      where: { id: equipmentId, deletedAt: null },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // RBAC check - verify user has access to update AMC for this equipment's restaurant
    await requireRestaurantAccess(session, equipment.restaurantId, "amc:update");

    // Verify AMC subscription exists
    const existing = await db.aMCSubscription.findFirst({
      where: {
        id: amcId,
        equipmentId,
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

    // External AMC editable fields
    if (validation.data.planName !== undefined) updateData.planName = validation.data.planName;
    if (validation.data.planDescription !== undefined) updateData.planDescription = validation.data.planDescription;
    if (validation.data.providerName !== undefined) updateData.providerName = validation.data.providerName;
    if (validation.data.providerContact !== undefined) updateData.providerContact = validation.data.providerContact;
    if (validation.data.contractNumber !== undefined) updateData.contractNumber = validation.data.contractNumber;
    if (validation.data.documentUrl !== undefined) updateData.documentUrl = validation.data.documentUrl;
    if (validation.data.totalAmount !== undefined) updateData.totalAmount = validation.data.totalAmount;
    if (validation.data.featuresJson !== undefined) updateData.featuresJson = validation.data.featuresJson;

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
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
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

    // Verify equipment exists and get restaurantId for RBAC
    const equipment = await db.equipment.findFirst({
      where: { id: equipmentId, deletedAt: null },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // RBAC check - verify user has access to cancel AMC for this equipment's restaurant
    await requireRestaurantAccess(session, equipment.restaurantId, "amc:cancel");

    // Verify AMC subscription exists
    const existing = await db.aMCSubscription.findFirst({
      where: {
        id: amcId,
        equipmentId,
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
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
