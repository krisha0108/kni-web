import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/public/recruitment-payment/[candidateId]
 * Public: fetch the pending registration payment order for the candidate's payment page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;

    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        engagementType: true,
        finalCommissionRate: true,
        finalMonthlySalary: true,
      },
    });
    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
    }

    const payment = await db.recruitmentPayment.findFirst({
      where: { candidateId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (!payment) {
      if (candidate.status === "REGISTERED_PARTNER" || candidate.status === "TRAINING_PENDING" || candidate.status === "ACTIVE_TECHNICIAN") {
        return NextResponse.json({ ok: false, error: "Payment already completed" }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: "No pending payment found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        orderId: payment.razorpayOrderId,
        amount: payment.amount,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        candidateName: candidate.fullName,
        email: candidate.email,
        engagementType: candidate.engagementType,
        finalCommissionRate: candidate.finalCommissionRate,
        finalMonthlySalary: candidate.finalMonthlySalary,
      },
    });
  } catch (error) {
    console.error("Get recruitment payment error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
