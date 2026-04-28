import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { getOrCreateSystemVendor } from "@/server/my-store";
import { createNotification } from "@/server/notifications/service";
import { sendMarketplacePaymentRejectedEmail } from "@/lib/email";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    await getOrCreateSystemVendor(session.id);
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
        owner: { select: { name: true, email: true } },
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
        { ok: false, error: "This payment does not belong to your store" },
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
      message: `Your payment to KNI Official Store was rejected. Reason: ${reason}`,
      type: "PAYMENT",
      linkUrl: "/owner/marketplace",
    }).catch(console.error);

    // Send email to owner (non-blocking)
    if (payment.owner?.email) {
      sendMarketplacePaymentRejectedEmail(
        payment.owner.email,
        payment.owner.name || "Restaurant Owner",
        reason
      ).catch(console.error);
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Admin reject marketplace payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
