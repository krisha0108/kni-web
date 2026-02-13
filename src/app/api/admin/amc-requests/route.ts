import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";
import { createNotification } from "@/server/notifications/service";

const createAMCRequestSchema = z.object({
  ownerId: z.string().min(1, "Owner is required"),
  restaurantId: z.string().min(1, "Restaurant is required"),
  kitchenType: z.string().min(1, "Kitchen type is required"),
  equipmentCategories: z.array(z.string()).min(1, "At least one equipment category is required"),
  planType: z.enum(["BASIC", "STANDARD", "PREMIUM"], { message: "Invalid plan type" }),
  visitFrequency: z.enum(["MONTHLY", "BI_MONTHLY", "QUARTERLY"], { message: "Invalid visit frequency" }),
  preferredStartDate: z.string().min(1, "Preferred start date is required"),
  notes: z.string().optional(),
});

/**
 * GET /api/admin/amc-requests
 * List all AMC requests for admin with filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { restaurant: { name: { contains: search } } },
        { owner: { name: { contains: search } } },
        { kitchenType: { contains: search } },
      ];
    }

    const requests = await db.aMCRequest.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        restaurant: { select: { id: true, name: true, city: true, address: true } },
        survey: {
          include: { engineer: { select: { name: true, phone: true } } },
        },
        proposal: {
          include: { contract: { select: { id: true, contractNumber: true, status: true } } },
        },
        payment: {
          select: { id: true, paymentType: true, amount: true, screenshotUrl: true, status: true, rejectionReason: true },
        },
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
 * POST /api/admin/amc-requests
 * Create AMC request on behalf of owner
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = createAMCRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { ownerId, restaurantId, kitchenType, equipmentCategories, planType, visitFrequency, preferredStartDate, notes } = validation.data;

    // Validate owner exists
    const owner = await db.user.findFirst({
      where: { id: ownerId, role: "OWNER", deletedAt: null },
    });

    if (!owner) {
      return NextResponse.json(
        { ok: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    // Validate restaurant belongs to owner and is approved
    const restaurant = await db.restaurant.findFirst({
      where: { id: restaurantId, ownerId, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 404 }
      );
    }

    // Check for duplicate active AMC request
    const existingRequest = await db.aMCRequest.findFirst({
      where: {
        restaurantId,
        ownerId,
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
        ownerId,
        restaurantId,
        equipmentCategories,
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

    // Notify owner
    createNotification({
      userId: ownerId,
      title: "AMC Request Created",
      message: `An AMC request has been created on your behalf for ${restaurant.name}`,
      type: "AMC",
      linkUrl: "/owner/amc",
    }).catch((err) => {
      console.error("Failed to notify owner:", err);
    });

    return NextResponse.json({ ok: true, data: amcRequest }, { status: 201 });
  } catch (error) {
    console.error("Create AMC request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
