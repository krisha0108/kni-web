import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/admin/vendor-subscriptions/[id]/set-price
 * Admin sets the price for a subscription request
 * Only allowed when status = REQUESTED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { price, adminNote } = body;

    if (!price || typeof price !== "number" || price <= 0) {
      return NextResponse.json(
        { ok: false, error: "A valid price (positive number) is required" },
        { status: 400 }
      );
    }

    const subRequest = await db.vendorSubscriptionRequest.findUnique({
      where: { id },
      include: { vendor: { select: { name: true } } },
    });

    if (!subRequest) {
      return NextResponse.json({ ok: false, error: "Subscription request not found" }, { status: 404 });
    }

    if (subRequest.status !== "REQUESTED") {
      return NextResponse.json(
        { ok: false, error: "Price can only be set when status is REQUESTED" },
        { status: 400 }
      );
    }

    await db.vendorSubscriptionRequest.update({
      where: { id },
      data: {
        price,
        adminNote: adminNote || null,
        status: "PRICE_SENT",
        priceSentAt: new Date(),
        priceSentById: session.id,
      },
    });

    // Notify vendor
    await createNotification({
      userId: subRequest.vendorId,
      title: "Subscription Price Set",
      message: `Subscription price: Rs. ${price}. Please make payment.`,
      type: NotificationType.PAYMENT,
      linkUrl: "/vendor/subscription",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Set price error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
