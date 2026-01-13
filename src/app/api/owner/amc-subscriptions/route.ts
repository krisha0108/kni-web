import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { amcSubscriptionSchema } from "@/server/validators/amc";
import { calculateAMCEndDate } from "@/lib/amc";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const restaurantId = searchParams.get("restaurantId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with amc:read permission
    await requireRestaurantAccess(session, restaurantId, "amc:read");

    const where: any = {
      restaurantId,
      ...(status ? { status: status as any } : {}),
    };

    const [subscriptions, total] = await Promise.all([
      db.aMCSubscription.findMany({
        where,
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
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.aMCSubscription.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { subscriptions, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get AMC subscriptions error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();

    const body = await request.json();
    const validation = amcSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Get equipment and verify restaurant access
    const equipment = await db.equipment.findUnique({
      where: {
        id: validation.data.equipmentId,
        deletedAt: null,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
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

    // Check restaurant access with amc:create permission
    await requireRestaurantAccess(session, equipment.restaurantId, "amc:create");

    if (equipment.restaurant.status !== "APPROVED") {
      return NextResponse.json(
        { ok: false, error: "Restaurant must be approved to create AMC subscription" },
        { status: 400 }
      );
    }

    // Check if there's already an active subscription for this equipment
    const existingSubscription = await db.aMCSubscription.findFirst({
      where: {
        equipmentId: validation.data.equipmentId,
        status: "ACTIVE",
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { ok: false, error: "This equipment already has an active AMC subscription" },
        { status: 400 }
      );
    }

    // Calculate end date based on duration
    const startDate = new Date(validation.data.startDate);
    const endDate = calculateAMCEndDate(startDate, validation.data.duration);

    // Prepare subscription data
    const subscriptionData: any = {
      equipmentId: validation.data.equipmentId,
      ownerId: session.id,
      restaurantId: equipment.restaurantId,
      duration: validation.data.duration,
      serviceLimit: validation.data.serviceLimit,
      totalAmount: validation.data.totalAmount,
      startDate,
      endDate,
      status: "ACTIVE",
      autoRenew: validation.data.autoRenew || false,
      servicesUsed: 0,
    };

    // If using an admin plan template
    if (validation.data.planId) {
      const plan = await db.aMCPlan.findFirst({
        where: {
          id: validation.data.planId,
          isActive: true,
          deletedAt: null,
        },
      });

      if (!plan) {
        return NextResponse.json(
          { ok: false, error: "AMC plan not found or inactive" },
          { status: 404 }
        );
      }

      subscriptionData.planId = plan.id;
      subscriptionData.planName = plan.name;
      subscriptionData.planDescription = plan.description;
      subscriptionData.featuresJson = plan.featuresJson || [];
    } else {
      // Custom plan
      subscriptionData.planName = validation.data.planName || "Custom Plan";
      subscriptionData.planDescription = validation.data.planDescription;
      subscriptionData.featuresJson = validation.data.featuresJson || [];
    }

    // Create subscription
    const subscription = await db.aMCSubscription.create({
      data: subscriptionData,
      include: {
        plan: true,
        equipment: {
          select: {
            id: true,
            name: true,
            category: true,
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
      },
    });

    return NextResponse.json({ ok: true, data: subscription });
  } catch (error) {
    console.error("Create AMC subscription error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
