import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";
import { createNotification } from "@/server/notifications/service";

const markPaidSchema = z.object({
  paymentNote: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await req.json();
    const validation = markPaidSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { paymentNote } = validation.data;

    // Check if payout exists and is pending
    const payout = await db.payout.findUnique({
      where: { id },
    });

    if (!payout) {
      return NextResponse.json(
        { ok: false, error: "Payout not found" },
        { status: 404 }
      );
    }

    if (payout.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: `Payout is already ${payout.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Mark as paid
    const updatedPayout = await db.payout.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentNote: paymentNote || null,
      },
      include: {
        engineer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify engineer about payout
    createNotification({
      userId: updatedPayout.engineer.id,
      title: "Payout Processed!",
      message: `Your payout of ₹${updatedPayout.amount.toLocaleString('en-IN')} has been processed.${paymentNote ? ` Note: ${paymentNote}` : ''}`,
      type: "PAYMENT",
      linkUrl: "/engineer/earnings",
      data: { type: "payout" },
    }).catch(console.error);

    return NextResponse.json({ ok: true, data: updatedPayout });
  } catch (error) {
    console.error("Mark payout as paid error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to mark payout as paid" },
      { status: 500 }
    );
  }
}
