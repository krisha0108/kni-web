import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";
import { z } from "zod";
import { createNotification } from "@/server/notifications/service";

const updateOrderSchema = z.object({
  status: z.enum(["PLACED", "CANCELLED"]),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVendor();
    const { id } = await params;

    const order = await db.marketplaceOrder.findFirst({
      where: {
        id,
        vendorId: session.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: order,
    });
  } catch (error) {
    console.error("Get vendor order error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVendor();
    const { id } = await params;
    const body = await request.json();

    const validation = updateOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify order belongs to vendor
    const existingOrder = await db.marketplaceOrder.findFirst({
      where: {
        id,
        vendorId: session.id,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Update order
    const order = await db.marketplaceOrder.update({
      where: { id },
      data: {
        status: validation.data.status,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    });

    // Create notification for owner
    const statusMessages: Record<string, string> = {
      PLACED: "Your order has been confirmed",
      CANCELLED: "Your order has been cancelled",
    };

    await createNotification({
      userId: order.ownerId,
      title: "Order Status Updated",
      message: `${statusMessages[validation.data.status]} for ${order.restaurant.name}`,
      linkUrl: `/owner/marketplace/orders`,
    });

    return NextResponse.json({
      ok: true,
      data: order,
    });
  } catch (error) {
    console.error("Update vendor order error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
