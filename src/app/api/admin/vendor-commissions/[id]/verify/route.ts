import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { z } from "zod";

const verifySchema = z.object({
  adminNote: z.string().optional(),
});

/**
 * POST /api/admin/vendor-commissions/[id]/verify
 * Admin verifies a commission payment (collection must be in PAYMENT_UPLOADED status).
 * [id] = VendorCommissionCollection ID
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const validation = verifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { adminNote } = validation.data;

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
        { ok: false, error: "Only collections with PAYMENT_UPLOADED status can be verified" },
        { status: 400 }
      );
    }

    const updatedCollection = await db.vendorCommissionCollection.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verifiedById: session.id,
        verifiedAt: new Date(),
        ...(adminNote && { adminNote }),
      },
    });

    await createNotification({
      userId: collection.vendorId,
      title: "Commission Payment Verified",
      message: "Your commission payment has been verified. Thank you!",
      type: "PAYMENT",
      linkUrl: `/vendor/commissions/${id}`,
    });

    return NextResponse.json({ ok: true, data: updatedCollection });
  } catch (error) {
    console.error("Verify commission payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
