import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";
import { sendVendorSubscriptionRejectedEmail } from "@/lib/email";

/**
 * POST /api/admin/vendor-subscriptions/[id]/reject
 * Admin rejects payment screenshot — vendor can re-upload
 * Only allowed when status = PAYMENT_UPLOADED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
      return NextResponse.json(
        { ok: false, error: "Rejection reason is required (minimum 10 characters)" },
        { status: 400 }
      );
    }

    const subRequest = await db.vendorSubscriptionRequest.findUnique({
      where: { id },
      include: { vendor: { select: { name: true, email: true } } },
    });

    if (!subRequest) {
      return NextResponse.json({ ok: false, error: "Subscription request not found" }, { status: 404 });
    }

    if (subRequest.status !== "PAYMENT_UPLOADED") {
      return NextResponse.json(
        { ok: false, error: "Only PAYMENT_UPLOADED requests can be rejected" },
        { status: 400 }
      );
    }

    await db.vendorSubscriptionRequest.update({
      where: { id },
      data: {
        status: "PAYMENT_REJECTED",
        rejectionReason: reason.trim(),
      },
    });

    // Notify vendor
    await createNotification({
      userId: subRequest.vendorId,
      title: "Payment Rejected",
      message: `Payment rejected: ${reason.trim().substring(0, 100)}. Please re-upload.`,
      type: NotificationType.PAYMENT,
      linkUrl: "/vendor/subscription",
    });

    // Send email (non-blocking)
    if (subRequest.vendor.email) {
      sendVendorSubscriptionRejectedEmail(
        subRequest.vendor.email,
        subRequest.vendor.name || "Vendor",
        reason.trim()
      ).catch((error) => {
        console.error("Failed to send vendor subscription rejected email:", error);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reject subscription payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
