import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";
import { MarketplaceOrderStatus } from "@prisma/client";
import { sendOrderStatusUpdateEmail } from "@/lib/email";
import { cancellationReasonSchema } from "@/lib/validations/rejection";
import { maybeCreateFinalMarketplacePayment, maybeRefundAdvanceOnCancel } from "@/server/marketplace/final-payment";

const updateStatusSchema = z.object({
  status: z.enum([
    "PLACED",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
  statusNotes: z.string().optional(),
  cancellationReason: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  actualDeliveryDate: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id: orderId } = await params;

    // Verify the order belongs to admin's system vendor
    const order = await db.marketplaceOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        vendorId: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.vendorId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { status, statusNotes, cancellationReason, expectedDeliveryDate, actualDeliveryDate } =
      validation.data;

    // Validate cancellation reason if status is CANCELLED
    if (status === "CANCELLED") {
      if (!cancellationReason) {
        return NextResponse.json(
          { ok: false, error: "Cancellation reason is required when cancelling an order" },
          { status: 400 }
        );
      }

      const reasonValidation = cancellationReasonSchema.safeParse(cancellationReason);
      if (!reasonValidation.success) {
        return NextResponse.json(
          { ok: false, error: reasonValidation.error.issues[0]?.message || "Invalid cancellation reason" },
          { status: 400 }
        );
      }
    }

    // Validate status transition
    const validTransitions: Record<
      MarketplaceOrderStatus,
      MarketplaceOrderStatus[]
    > = {
      PLACED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED", "CANCELLED"],
      DELIVERED: [],
      CANCELLED: [],
    };

    const currentStatus = order.status as MarketplaceOrderStatus;
    const newStatus = status as MarketplaceOrderStatus;

    if (!validTransitions[currentStatus].includes(newStatus)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot transition from ${currentStatus} to ${newStatus}`,
        },
        { status: 400 }
      );
    }

    // Update order status and create history entry in a transaction
    const result = await db.$transaction(async (tx) => {
      const updatedOrder = await tx.marketplaceOrder.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          statusNotes,
          cancellationReason: newStatus === "CANCELLED" ? cancellationReason : undefined,
          expectedDeliveryDate: expectedDeliveryDate
            ? new Date(expectedDeliveryDate)
            : undefined,
          actualDeliveryDate:
            newStatus === "DELIVERED" && actualDeliveryDate
              ? new Date(actualDeliveryDate)
              : newStatus === "DELIVERED"
              ? new Date()
              : undefined,
          statusUpdatedAt: new Date(),
        },
        include: {
          restaurant: {
            select: {
              name: true,
              city: true,
            },
          },
          owner: {
            select: {
              name: true,
              email: true,
            },
          },
          vendor: {
            select: {
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  unit: true,
                },
              },
            },
          },
        },
      });

      // Create status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          oldStatus: currentStatus,
          newStatus: newStatus,
          notes: statusNotes || `Status updated to ${newStatus}`,
          changedBy: session.id,
        },
      });

      return updatedOrder;
    });

    // Send email notification
    try {
      await sendOrderStatusUpdateEmail(
        result.owner.email,
        result.owner.name,
        orderId,
        result.restaurant.name,
        currentStatus,
        newStatus,
        statusNotes || null,
        result.vendor.name,
        result.totalAmount,
        expectedDeliveryDate || null,
        result.actualDeliveryDate?.toISOString() || null
      );
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
    }

    if (newStatus === "DELIVERED") {
      maybeCreateFinalMarketplacePayment(orderId).catch((error) =>
        console.error("Failed to create final marketplace payment:", error)
      );
    } else if (newStatus === "CANCELLED") {
      maybeRefundAdvanceOnCancel(orderId).catch((error) =>
        console.error("Failed to refund advance on cancel:", error)
      );
    }

    return NextResponse.json({
      ok: true,
      data: result,
      message: `Order status updated to ${newStatus}`,
    });
  } catch (error) {
    console.error("Update admin store order status error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: msg.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// Get order status history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id: orderId } = await params;

    // Verify the order belongs to admin's system vendor
    const order = await db.marketplaceOrder.findUnique({
      where: { id: orderId },
      select: { vendorId: true },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.vendorId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const history = await db.orderStatusHistory.findMany({
      where: { orderId },
      include: {
        changedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      data: history,
    });
  } catch (error) {
    console.error("Get admin store order status history error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
