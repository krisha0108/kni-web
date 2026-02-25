import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { z } from "zod";

const rejectSchema = z.object({
  rejectionReason: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters"),
});

/**
 * POST /api/admin/vendor-commissions/[id]/reject
 * Admin rejects a commission payment (collection must be in PAYMENT_UPLOADED status).
 * [id] = VendorCommissionCollection ID
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const validation = rejectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { rejectionReason } = validation.data;

    const collection = await db.vendorCommissionCollection.findUnique({
      where: { id },
    });

    if (!collection) {
      return NextResponse.json(
        { ok: false, error: "Commission collection not found" },
        { status: 404 }
      );
    }

    if (collection.status !== "PAYMENT_UPLOADED") {
      return NextResponse.json(
        { ok: false, error: "Only collections with PAYMENT_UPLOADED status can be rejected" },
        { status: 400 }
      );
    }

    const updatedCollection = await db.vendorCommissionCollection.update({
      where: { id },
      data: {
        status: "PAYMENT_REJECTED",
        rejectionReason,
      },
    });

    await createNotification({
      userId: collection.vendorId,
      title: "Commission Payment Rejected",
      message: `Your commission payment was rejected. Reason: ${rejectionReason}. Please re-upload the payment screenshot.`,
      type: "PAYMENT",
      linkUrl: `/vendor/commissions/${id}`,
    });

    return NextResponse.json({ ok: true, data: updatedCollection });
  } catch (error) {
    console.error("Reject commission payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
