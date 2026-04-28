import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";
import { sendVendorSubscriptionActivatedEmail } from "@/lib/email";

/**
 * POST /api/admin/vendor-subscriptions/[id]/verify
 * Admin verifies payment and activates subscription
 * Only allowed when status = PAYMENT_UPLOADED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const subRequest = await db.vendorSubscriptionRequest.findUnique({
      where: { id },
      include: { vendor: { select: { name: true, email: true } } },
    });

    if (!subRequest) {
      return NextResponse.json({ ok: false, error: "Subscription request not found" }, { status: 404 });
    }

    if (subRequest.status !== "PAYMENT_UPLOADED") {
      return NextResponse.json(
        { ok: false, error: "Only PAYMENT_UPLOADED requests can be verified" },
        { status: 400 }
      );
    }

    // Calculate activeUntil
    const now = new Date();
    const activeUntil = new Date(now);
    activeUntil.setMonth(activeUntil.getMonth() + subRequest.durationMonths);

    // Activate subscription in a transaction
    await db.$transaction([
      db.vendorSubscriptionRequest.update({
        where: { id },
        data: {
          status: "ACTIVATED",
          verifiedById: session.id,
          verifiedAt: now,
          activatedAt: now,
          activeUntil,
        },
      }),
      db.vendorProfile.update({
        where: { userId: subRequest.vendorId },
        data: {
          subscriptionStatus: "ACTIVE",
          activeUntil,
        },
      }),
    ]);

    // Notify vendor
    await createNotification({
      userId: subRequest.vendorId,
      title: "Subscription Activated!",
      message: `Your subscription has been activated for ${subRequest.durationMonths} month(s)!`,
      type: NotificationType.PAYMENT,
      linkUrl: "/vendor/subscription",
    });

    // Send email (non-blocking)
    if (subRequest.vendor.email) {
      sendVendorSubscriptionActivatedEmail(
        subRequest.vendor.email,
        subRequest.vendor.name || "Vendor",
        subRequest.durationMonths
      ).catch((error) => {
        console.error("Failed to send vendor subscription activated email:", error);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Verify subscription error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
