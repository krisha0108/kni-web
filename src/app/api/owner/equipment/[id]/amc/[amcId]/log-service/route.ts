import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { z } from "zod";

const logServiceSchema = z.object({
  serviceDate: z.string().datetime("Invalid date format"),
  serviceType: z.string().min(2, "Service type must be at least 2 characters"),
  notes: z.string().optional(),
});

// POST /api/owner/equipment/[id]/amc/[amcId]/log-service - Log a service use for external AMC
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

    // Verify equipment exists
    const equipment = await db.equipment.findFirst({
      where: { id: equipmentId, deletedAt: null },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // RBAC check
    await requireRestaurantAccess(session, equipment.restaurantId, "amc:update");

    // Verify AMC subscription exists and is active
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

    // Create service use log and increment servicesUsed in a transaction
    // Service limit check is inside the transaction to prevent race conditions
    const serviceUse = await db.$transaction(async (tx) => {
      const current = await tx.aMCSubscription.findUnique({
        where: { id: amcId },
        select: { servicesUsed: true, serviceLimit: true },
      });

      if (current && current.serviceLimit > 0 && current.servicesUsed >= current.serviceLimit) {
        throw new Error("Service limit reached for this AMC");
      }

      const log = await tx.aMCServiceUse.create({
        data: {
          subscriptionId: amcId,
          serviceDate: new Date(validation.data.serviceDate),
          serviceType: validation.data.serviceType,
          notes: validation.data.notes || null,
        },
      });

      await tx.aMCSubscription.update({
        where: { id: amcId },
        data: { servicesUsed: { increment: 1 } },
      });

      return log;
    });

    return NextResponse.json({ ok: true, data: serviceUse });
  } catch (error) {
    console.error("Log AMC service error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : error instanceof Error && error.message.includes("Service limit reached") ? 400 : 500 }
    );
  }
}
