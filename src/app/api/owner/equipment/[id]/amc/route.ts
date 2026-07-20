import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { amcSubscriptionSchema } from "@/server/validators/amc";
import { calculateAMCEndDate } from "@/lib/amc";

// GET /api/owner/equipment/[id]/amc - Get AMC subscriptions for equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: equipmentId } = await params;

    // Verify equipment exists
    const equipment = await db.equipment.findFirst({
      where: {
        id: equipmentId,
        deletedAt: null,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // RBAC check - verify user has access to read AMC for this equipment's restaurant
    await requireRestaurantAccess(session, equipment.restaurantId, "amc:read");

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
    const session = await requireOwnerMobile(request);
    const { id: equipmentId } = await params;

    const body = await request.json();
    const validation = amcSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify equipment exists
    const equipment = await db.equipment.findFirst({
      where: {
        id: equipmentId,
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

    // RBAC check - verify user has access to create AMC for this equipment's restaurant
    await requireRestaurantAccess(session, equipment.restaurantId, "amc:create");

    if (equipment.restaurant.status !== "APPROVED") {
      return NextResponse.json(
        { ok: false, error: "Restaurant must be approved" },
        { status: 400 }
      );
    }

    // Check for existing ACTIVE subscription of the same source
    const source = validation.data.source || "INTERNAL";
    const existingActive = await db.aMCSubscription.findFirst({
      where: {
        equipmentId,
        status: "ACTIVE",
        source,
      },
    });

    if (existingActive) {
      return NextResponse.json(
        { ok: false, error: `Equipment already has an active ${source === "EXTERNAL" ? "external" : "internal"} AMC subscription` },
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

    // Use actual restaurant owner ID for FK
    const ownerId = await getRestaurantOwnerId(equipment.restaurantId);

    // Create AMC subscription
    const subscription = await db.aMCSubscription.create({
      data: {
        equipmentId,
        ownerId,
        restaurantId: equipment.restaurantId,
        ...planData,
        startDate,
        endDate,
        autoRenew: source === "EXTERNAL" ? false : (validation.data.autoRenew || false),
        status: "ACTIVE",
        source,
        ...(source === "EXTERNAL" ? {
          providerName: validation.data.providerName || null,
          providerContact: validation.data.providerContact || null,
          contractNumber: validation.data.contractNumber || null,
          documentUrl: validation.data.documentUrl || null,
        } : {}),
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
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
