import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/owner/amc-proposals/[id]/accept
 * Owner accepts the proposal → creates AMCPayment (PENDING) → status becomes PAYMENT_PENDING
 * Contract is NOT created until admin verifies payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;

    const proposal = await db.aMCProposal.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            restaurant: { select: { id: true, name: true } },
            payment: true,
          },
        },
      },
    });

    if (!proposal || proposal.request.ownerId !== session.id) {
      return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.status !== "SENT") {
      return NextResponse.json({ ok: false, error: "Proposal cannot be accepted in current state" }, { status: 400 });
    }

    // Determine payment amount (use annual > quarterly > monthly)
    let paymentAmount = proposal.monthlyPrice;
    if (proposal.annualPrice) {
      paymentAmount = proposal.annualPrice;
    } else if (proposal.quarterlyPrice) {
      paymentAmount = proposal.quarterlyPrice;
    }

    // Determine payment type
    const isRenewal = !!proposal.request.renewalOfContractId;
    const paymentType = isRenewal ? "RENEWAL" : "PROPOSAL";

    // Update proposal status, request status, and create payment record
    await db.$transaction([
      db.aMCProposal.update({
        where: { id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      }),
      db.aMCRequest.update({
        where: { id: proposal.requestId },
        data: { status: "PAYMENT_PENDING" },
      }),
      // Create payment record (only if not already exists)
      ...(proposal.request.payment
        ? []
        : [
            db.aMCPayment.create({
              data: {
                requestId: proposal.requestId,
                ownerId: session.id,
                paymentType,
                amount: paymentAmount,
              },
            }),
          ]),
    ]);

    // Notify admins
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "AMC Proposal Accepted - Payment Pending",
        message: `Owner accepted AMC proposal for "${proposal.request.restaurant.name}". Waiting for payment screenshot.`,
        type: NotificationType.AMC,
        linkUrl: `/admin/amc-requests`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Accept proposal error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
