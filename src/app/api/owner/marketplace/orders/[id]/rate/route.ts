import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";
import { createVendorRating } from "@/server/ratings/service";
import { z } from "zod";
import { createNotification } from "@/server/notifications/service";

const vendorRatingSchema = z.object({
  overallRating: z.number().min(1).max(5),
  productQuality: z.number().min(1).max(5).optional(),
  deliveryTime: z.number().min(1).max(5).optional(),
  customerService: z.number().min(1).max(5).optional(),
  valueForMoney: z.number().min(1).max(5).optional(),
  packaging: z.number().min(1).max(5).optional(),
  review: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: orderId } = await params;

    // Verify order exists and is delivered
    const order = await db.marketplaceOrder.findUnique({
      where: { id: orderId },
      include: {
        vendor: { select: { id: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          error: "Order not found",
        },
        { status: 404 }
      );
    }

    // RBAC check using restaurantId from the order
    await requireRestaurantAccess(session, order.restaurantId, "marketplace:create");

    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        {
          ok: false,
          error: "Can only rate delivered orders",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = vendorRatingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    // Get the actual restaurant owner ID for the FK
    const ownerId = await getRestaurantOwnerId(order.restaurantId);

    const rating = await createVendorRating({
      orderId,
      vendorId: order.vendorId,
      ownerId,
      restaurantId: order.restaurantId,
      ...validation.data,
    });

    // Notify vendor about new rating
    createNotification({
      userId: order.vendorId,
      title: "New Rating Received",
      message: `You received a ${validation.data.overallRating}/5 rating for order #${orderId.slice(0, 8)}.`,
      type: "ORDER",
      linkUrl: "/vendor/orders",
      data: { type: "rating" },
    }).catch(console.error);

    return NextResponse.json({
      ok: true,
      message: "Rating submitted successfully",
      data: rating,
    });
  } catch (error: any) {
    console.error("Vendor rating error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET - Fetch existing rating for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: orderId } = await params;

    // Verify order exists
    const order = await db.marketplaceOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          error: "Order not found",
        },
        { status: 404 }
      );
    }

    // RBAC check using restaurantId from the order
    await requireRestaurantAccess(session, order.restaurantId, "marketplace:read");

    const rating = await db.vendorRating.findUnique({
      where: { orderId },
    });

    return NextResponse.json({
      ok: true,
      data: rating,
    });
  } catch (error: any) {
    console.error("Fetch vendor rating error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
