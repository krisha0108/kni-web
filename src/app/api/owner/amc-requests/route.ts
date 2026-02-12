import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";

/**
 * GET /api/owner/amc-requests
 * List all AMC requests for the logged-in owner
 */
export async function GET() {
  try {
    const session = await requireOwner();

    const requests = await db.aMCRequest.findMany({
      where: { ownerId: session.id },
      include: {
        restaurant: { select: { id: true, name: true, city: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: requests });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

/**
 * POST /api/owner/amc-requests
 * Create a new AMC request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();
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

    // Validate restaurant belongs to owner
    const restaurant = await db.restaurant.findFirst({
      where: { id: restaurantId, ownerId: session.id, status: "APPROVED" },
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

    // Check for existing pending request for this restaurant
    const existingRequest = await db.aMCRequest.findFirst({
      where: {
        restaurantId,
        ownerId: session.id,
        status: { in: ["REQUESTED", "SURVEY_SCHEDULED", "SURVEY_COMPLETED", "PROPOSAL_SENT", "PAYMENT_PENDING", "PAYMENT_UPLOADED"] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { ok: false, error: "An active AMC request already exists for this restaurant" },
        { status: 400 }
      );
    }

    const amcRequest = await db.aMCRequest.create({
      data: {
        ownerId: session.id,
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
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
