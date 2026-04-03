import { NextRequest, NextResponse } from "next/server";
import { requireRoleMobile } from "@/server/auth/rbac";
import { Role } from "@prisma/client";
import { createRazorpayOrder } from "@/lib/razorpay";
import { z } from "zod";

const schema = z.object({
  amount: z.number().int().positive("Amount must be positive"),
  type: z.enum(["MARKETPLACE", "SERVICE_BOOKING", "AMC_PAYMENT", "VENDOR_COMMISSION", "VENDOR_SUBSCRIPTION"]),
  referenceId: z.string().optional(),
  notes: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Allow OWNER, ADMIN, and VENDOR
    const session = await requireRoleMobile(request, Role.OWNER, Role.ADMIN, Role.VENDOR);
    const body = await request.json();
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { amount, type, referenceId, notes } = validation.data;

    // Razorpay receipt max 40 chars
    const shortRef = (referenceId || session.id).slice(-8);
    const receipt = `${type.slice(0, 3)}_${shortRef}_${Date.now()}`;

    const order = await createRazorpayOrder(amount, receipt, {
      type,
      userId: session.id,
      ...(notes || {}),
    });

    return NextResponse.json({
      ok: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        prefill: {
          name: session.name || "",
          email: session.email || "",
        },
      },
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const isAuthError = message.includes("Unauthorized") || message.includes("Forbidden");
    return NextResponse.json(
      { ok: false, error: message },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
