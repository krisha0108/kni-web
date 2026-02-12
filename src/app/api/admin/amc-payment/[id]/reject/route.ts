import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/admin/amc-payment/[id]/reject
 * Admin rejects payment screenshot → Owner needs to re-upload
 * [id] = AMCPayment ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ ok: false, error: "Rejection reason is required" }, { status: 400 });
    }

    const payment = await db.aMCPayment.findUnique({
      where: { id },
      include: {
        request: {
          include: { restaurant: { select: { name: true } } },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "UPLOADED") {
      return NextResponse.json({ ok: false, error: "Only UPLOADED payments can be rejected" }, { status: 400 });
    }

    // Reject payment - owner can re-upload
    await db.$transaction([
      db.aMCPayment.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
          verifiedById: session.id,
        },
      }),
      db.aMCRequest.update({
        where: { id: payment.requestId },
        data: { status: "PAYMENT_PENDING" },
      }),
    ]);

    // Notify owner
    await createNotification({
      userId: payment.ownerId,
      title: "AMC Payment Rejected",
      message: `Your payment screenshot for "${payment.request.restaurant.name}" was rejected. Reason: ${reason}. Please re-upload.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-requests/${payment.requestId}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reject payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
