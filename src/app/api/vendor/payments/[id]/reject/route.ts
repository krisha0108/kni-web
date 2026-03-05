import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendorMobile } from "@/server/auth/rbac";
import { createNotification, notifyRestaurantTeam } from "@/server/notifications/service";
import { RestaurantRole } from "@prisma/client";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVendorMobile(request);
    const { id } = await params;

    const body = await request.json();
    const validation = rejectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { reason } = validation.data;

    const payment = await db.marketplacePayment.findUnique({
      where: { id },
      include: {
        vendor: { select: { name: true } },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.vendorId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "This payment does not belong to you" },
        { status: 403 }
      );
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: `Payment is already ${payment.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    const updated = await db.marketplacePayment.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
      },
    });

    // Notify owner
    createNotification({
      userId: payment.ownerId,
      title: "Payment Rejected",
      message: `Your payment to ${payment.vendor.name} was rejected. Reason: ${reason}`,
      type: "PAYMENT",
      linkUrl: "/owner/marketplace",
    }).catch(console.error);

    // Notify team members (non-blocking)
    notifyRestaurantTeam({
      restaurantId: payment.restaurantId,
      excludeUserIds: [payment.ownerId],
      roles: [RestaurantRole.MANAGER],
      title: "Marketplace Payment Rejected",
      message: `Payment to ${payment.vendor.name} was rejected. Reason: ${reason}`,
      type: "PAYMENT",
      linkUrl: "/owner/marketplace",
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Reject marketplace payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
