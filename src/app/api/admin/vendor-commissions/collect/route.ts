import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { z } from "zod";

const collectSchema = z.object({
  vendorId: z.string().min(1, "vendorId is required"),
});

/**
 * POST /api/admin/vendor-commissions/collect
 * Admin triggers commission collection for a vendor.
 * Gathers all pending (uncollected) commissions into a new collection record.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = collectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { vendorId } = validation.data;

    // Find all uncollected commissions for this vendor
    const pendingCommissions = await db.vendorCommission.findMany({
      where: {
        vendorId,
        collectionId: null,
      },
    });

    if (pendingCommissions.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No pending commissions to collect" },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = pendingCommissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0
    );

    // Create collection and link all pending commissions in a transaction
    const collection = await db.$transaction(async (tx) => {
      const newCollection = await tx.vendorCommissionCollection.create({
        data: {
          vendorId,
          totalAmount,
          status: "REQUESTED",
        },
      });

      await tx.vendorCommission.updateMany({
        where: {
          id: { in: pendingCommissions.map((c) => c.id) },
        },
        data: {
          collectionId: newCollection.id,
        },
      });

      return newCollection;
    });

    // Format amount for notification
    const amountInRupees = totalAmount.toLocaleString("en-IN");

    await createNotification({
      userId: vendorId,
      title: "Commission Payment Due",
      message: `You have \u20B9${amountInRupees} in commission due. Please make the payment.`,
      type: "PAYMENT",
      linkUrl: `/vendor/commissions/${collection.id}`,
    });

    return NextResponse.json({ ok: true, data: collection });
  } catch (error) {
    console.error("Collect vendor commissions error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
