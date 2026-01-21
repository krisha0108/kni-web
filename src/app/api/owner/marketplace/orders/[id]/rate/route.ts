import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { createVendorRating } from "@/server/ratings/service";
import { z } from "zod";

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

    // Verify order belongs to owner and is delivered
    const order = await db.marketplaceOrder.findUnique({
      where: { id: orderId },
      include: {
        restaurant: { select: { ownerId: true } },
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

    if (order.restaurant.ownerId !== session.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized - not your order",
        },
        { status: 403 }
      );
    }

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

    const rating = await createVendorRating({
      orderId,
      vendorId: order.vendorId,
      ownerId: session.id,
      restaurantId: order.restaurantId,
      ...validation.data,
    });

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

    // Verify order belongs to owner
    const order = await db.marketplaceOrder.findUnique({
      where: { id: orderId },
      include: {
        restaurant: { select: { ownerId: true } },
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

    if (order.restaurant.ownerId !== session.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 403 }
      );
    }

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
