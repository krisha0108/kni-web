import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";

/**
 * GET /api/owner/amc-requests
 * List all AMC requests for a restaurant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    await requireRestaurantAccess(session, restaurantId, "amc:read");

    const where = { restaurantId };

    const [requests, total] = await Promise.all([
      db.aMCRequest.findMany({
        where,
        include: {
          restaurant: { select: { id: true, name: true, city: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.aMCRequest.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: requests, total, page, pageSize },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Unauthorized")) ? 401 : 500 }
    );
  }
}

/**
 * POST /api/owner/amc-requests
 * Create a new AMC request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();

    const {
      restaurantId,
      equipmentCategories,
      kitchenType,
      planType,
      visitFrequency,
      preferredStartDate,
      notes,
    } = body;

    // Validate required fields
    if (!restaurantId || !equipmentCategories || !kitchenType || !planType || !visitFrequency || !preferredStartDate) {
      return NextResponse.json(
        { ok: false, error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // Validate RBAC access
    await requireRestaurantAccess(session, restaurantId, "amc:create");

    // Validate restaurant is approved
    const restaurant = await db.restaurant.findFirst({
      where: { id: restaurantId, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 404 }
      );
    }

    // Validate plan type
    if (!["BASIC", "STANDARD", "PREMIUM"].includes(planType)) {
      return NextResponse.json(
        { ok: false, error: "Invalid plan type. Must be BASIC, STANDARD, or PREMIUM" },
        { status: 400 }
      );
    }

    // Validate visit frequency
    if (!["MONTHLY", "BI_MONTHLY", "QUARTERLY"].includes(visitFrequency)) {
      return NextResponse.json(
        { ok: false, error: "Invalid visit frequency" },
        { status: 400 }
      );
    }

    // Get actual restaurant owner ID for FK
    const ownerId = await getRestaurantOwnerId(restaurantId);

    // Check for existing pending request or active contract for this restaurant
    const existingRequest = await db.aMCRequest.findFirst({
      where: {
        restaurantId,
        status: { in: ["REQUESTED", "SURVEY_SCHEDULED", "SURVEY_COMPLETED", "PROPOSAL_SENT", "PAYMENT_PENDING", "PAYMENT_UPLOADED", "CONTRACT_ACTIVE"] },
      },
    });

    if (existingRequest) {
      const error = existingRequest.status === "CONTRACT_ACTIVE"
        ? "AMC is already active for this restaurant. You can renew from your contract details."
        : "An AMC request is already in progress for this restaurant.";
      return NextResponse.json(
        { ok: false, error },
        { status: 400 }
      );
    }

    const amcRequest = await db.aMCRequest.create({
      data: {
        ownerId,
        restaurantId,
        equipmentCategories: equipmentCategories,
        kitchenType,
        planType,
        visitFrequency,
        preferredStartDate: new Date(preferredStartDate),
        notes: notes || null,
      },
      include: {
        restaurant: { select: { id: true, name: true, city: true } },
      },
    });

    return NextResponse.json({ ok: true, data: amcRequest }, { status: 201 });
  } catch (error) {
    console.error("Create AMC request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Unauthorized")) ? 401 : 500 }
    );
  }
}
