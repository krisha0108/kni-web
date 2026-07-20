import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayPayment } from "@/lib/razorpay";
import { finalizeRecruitmentPayment } from "@/server/recruitment/onboarding";
import { db } from "@/server/db";
import { z } from "zod";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/**
 * POST /api/public/recruitment-payment/verify
 * Public: verifies a candidate's registration fee payment and converts them into a
 * live ENGINEER account. No session required — candidates aren't logged-in users.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validation.data;

    const pendingPayment = await db.recruitmentPayment.findFirst({
      where: { razorpayOrderId: razorpay_order_id, status: "PENDING" },
      select: { amount: true },
    });
    if (!pendingPayment) {
      // Could also be an already-processed payment being retried - let
      // finalizeRecruitmentPayment's own idempotency check handle that path.
      const alreadyVerified = await db.recruitmentPayment.findFirst({
        where: { razorpayOrderId: razorpay_order_id, status: "VERIFIED" },
      });
      if (!alreadyVerified) {
        return NextResponse.json({ ok: false, error: "No pending recruitment payment found for this order" }, { status: 400 });
      }
    } else {
      const verification = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, pendingPayment.amount);
      if (!verification.valid) {
        return NextResponse.json(
          { ok: false, error: verification.reason || "Payment verification failed" },
          { status: 400 }
        );
      }
    }

    const result = await finalizeRecruitmentPayment(razorpay_order_id, razorpay_payment_id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: { registrationId: result.registrationId, alreadyProcessed: result.alreadyProcessed || false },
    });
  } catch (error) {
    console.error("Recruitment payment verify error:", error);
    return NextResponse.json(
      { ok: false, error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
