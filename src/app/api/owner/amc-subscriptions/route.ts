import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
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

    const where: any = {
      ownerId: session.id,
      ...(status ? { status: status as any } : {}),
      ...(restaurantId ? { restaurantId } : {}),
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

    // Verify restaurant ownership
    const restaurant = await db.restaurant.findFirst({
      where: {
        id: validation.data.restaurantId,
        ownerId: session.id,
        status: "APPROVED",
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 404 }
      );
    }

    // Get plan details
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

    // Check if there's already an active subscription for this restaurant
    const existingSubscription = await db.aMCSubscription.findFirst({
      where: {
        restaurantId: validation.data.restaurantId,
        status: "ACTIVE",
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { ok: false, error: "This restaurant already has an active AMC subscription" },
        { status: 400 }
      );
    }

    // Calculate end date based on plan duration
    const startDate = new Date(validation.data.startDate);
    const endDate = calculateAMCEndDate(startDate, plan.duration as "MONTHLY" | "QUARTERLY" | "YEARLY");

    // Create subscription
    const subscription = await db.aMCSubscription.create({
      data: {
        planId: plan.id,
        ownerId: session.id,
        restaurantId: validation.data.restaurantId,
        startDate,
        endDate,
        status: "ACTIVE",
        autoRenew: validation.data.autoRenew || false,
        servicesUsed: 0,
        totalAmount: plan.price,
      },
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
    console.error("Create AMC subscription error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
