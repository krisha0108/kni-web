import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createRazorpayOrder } from "@/lib/razorpay";
import { sendSMS } from "@/server/sms/service";
import { sendBulkEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  amount: z.number().int().positive("Amount must be a positive number of rupees"),
  finalCommissionRate: z.number().int().min(0).max(100).optional(),
  finalMonthlySalary: z.number().int().positive().optional(),
});

/**
 * POST /api/admin/recruitment/[id]/create-payment
 * Admin generates the KNI Service Technician Registration Fee payment link for an
 * APPROVED candidate, moving them to REGISTRATION_PAYMENT_PENDING.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const candidate = await db.candidate.findUnique({ where: { id } });
    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
    }

    // Reuse an existing pending order rather than creating a duplicate
    const existingPending = await db.recruitmentPayment.findFirst({
      where: { candidateId: id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (candidate.status !== "APPROVED" && !(candidate.status === "REGISTRATION_PAYMENT_PENDING" && existingPending)) {
      return NextResponse.json(
        { ok: false, error: `Cannot send a payment link while status is ${candidate.status}` },
        { status: 400 }
      );
    }

    if (
      validation.data.finalCommissionRate !== undefined ||
      validation.data.finalMonthlySalary !== undefined
    ) {
      await db.candidate.update({
        where: { id },
        data: {
          ...(validation.data.finalCommissionRate !== undefined
            ? { finalCommissionRate: validation.data.finalCommissionRate }
            : {}),
          ...(validation.data.finalMonthlySalary !== undefined
            ? { finalMonthlySalary: validation.data.finalMonthlySalary }
            : {}),
        },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentLink = `${appUrl}/pay/recruitment/${id}`;

    if (existingPending) {
      return NextResponse.json({ ok: true, data: { paymentLink, orderId: existingPending.razorpayOrderId } });
    }

    const receipt = `REG_${id.slice(-8)}_${Date.now()}`;
    const order = await createRazorpayOrder(validation.data.amount, receipt, {
      type: "RECRUITMENT_FEE",
      candidateId: id,
    });

    await db.recruitmentPayment.create({
      data: {
        candidateId: id,
        amount: validation.data.amount,
        razorpayOrderId: order.id,
        status: "PENDING",
      },
    });

    await db.candidate.update({ where: { id }, data: { status: "REGISTRATION_PAYMENT_PENDING" } });

    await db.candidateActivityLog.create({
      data: {
        candidateId: id,
        type: "STATUS_CHANGED",
        description: `Registration payment link created (₹${validation.data.amount}) by ${admin.name}`,
        fromStatus: "APPROVED",
        toStatus: "REGISTRATION_PAYMENT_PENDING",
        performedBy: admin.name,
      },
    });

    sendSMS({
      phone: candidate.mobile,
      message: `Congratulations! Complete your KNI Services registration (₹${validation.data.amount}) here: ${paymentLink}`,
      purpose: "RECRUITMENT_PAYMENT_LINK",
    }).catch((err) => console.error("Payment link SMS failed:", err));

    sendBulkEmail([
      {
        email: candidate.email,
        subject: "Complete Your KNI Services Registration",
        html: `<p>Congratulations! Please complete your registration fee payment of ₹${validation.data.amount} using the link below:</p><p><a href="${paymentLink}">${paymentLink}</a></p>`,
      },
    ]).catch((err) => console.error("Payment link email failed:", err));

    return NextResponse.json({ ok: true, data: { paymentLink, orderId: order.id } });
  } catch (error) {
    console.error("Create recruitment payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
