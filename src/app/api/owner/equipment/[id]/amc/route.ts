import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { amcSubscriptionSchema } from "@/server/validators/amc";
import { calculateAMCEndDate } from "@/lib/amc";

// GET /api/owner/equipment/[id]/amc - Get AMC subscriptions for equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id: equipmentId } = await params;

    // Verify equipment ownership
    const equipment = await db.equipment.findFirst({
      where: {
        id: equipmentId,
        ownerId: session.id,
        deletedAt: null,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Get all AMC subscriptions for this equipment
    const subscriptions = await db.aMCSubscription.findMany({
      where: {
        equipmentId,
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        usageLogs: {
          take: 5,
          orderBy: { serviceDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: subscriptions });
  } catch (error) {
    console.error("Get equipment AMC error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// POST /api/owner/equipment/[id]/amc - Create AMC subscription for equipment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id: equipmentId } = await params;

    const body = await request.json();
    const validation = amcSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify equipment ownership
    const equipment = await db.equipment.findFirst({
      where: {
        id: equipmentId,
        ownerId: session.id,
        deletedAt: null,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    if (equipment.restaurant.status !== "APPROVED") {
      return NextResponse.json(
        { ok: false, error: "Restaurant must be approved" },
        { status: 400 }
      );
    }

    // Check for existing ACTIVE subscription
    const existingActive = await db.aMCSubscription.findFirst({
      where: {
        equipmentId,
        status: "ACTIVE",
      },
    });

    if (existingActive) {
      return NextResponse.json(
        { ok: false, error: "Equipment already has an active AMC subscription" },
        { status: 400 }
      );
    }

    const startDate = new Date(validation.data.startDate);
    const endDate = calculateAMCEndDate(startDate, validation.data.duration);

    // If planId is provided, use admin template plan
    let planData: any = {
      duration: validation.data.duration,
      serviceLimit: validation.data.serviceLimit,
      totalAmount: validation.data.totalAmount,
      featuresJson: validation.data.featuresJson || [],
    };

    if (validation.data.planId) {
      // Using admin template plan
      const plan = await db.aMCPlan.findFirst({
        where: {
          id: validation.data.planId,
          isActive: true,
          deletedAt: null,
        },
      });

      if (!plan) {
        return NextResponse.json(
          { ok: false, error: "Plan not found or inactive" },
          { status: 404 }
        );
      }

      planData = {
        planId: plan.id,
        planName: plan.name,
        planDescription: plan.description,
        duration: plan.duration,
        serviceLimit: plan.serviceLimit,
        totalAmount: plan.price,
        featuresJson: plan.featuresJson || [],
      };
    } else {
      // Custom plan
      planData.planName = validation.data.planName || `Custom AMC for ${equipment.name}`;
      planData.planDescription = validation.data.planDescription || null;
    }

    // Create AMC subscription
    const subscription = await db.aMCSubscription.create({
      data: {
        equipmentId,
        ownerId: session.id,
        restaurantId: equipment.restaurantId,
        ...planData,
        startDate,
        endDate,
        autoRenew: validation.data.autoRenew || false,
        status: "ACTIVE",
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: subscription });
  } catch (error) {
    console.error("Create equipment AMC error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
