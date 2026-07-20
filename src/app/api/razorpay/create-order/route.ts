import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRoleMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { Role } from "@prisma/client";
import { createRazorpayOrder } from "@/lib/razorpay";
import { computeMarketplaceAdvance } from "@/lib/marketplace-pricing";
import { z } from "zod";

const schema = z.object({
  amount: z.number().int().positive("Amount must be positive").optional(),
  type: z.enum([
    "MARKETPLACE",
    "MARKETPLACE_INSTALLMENT",
    "SERVICE_BOOKING",
    "AMC_PAYMENT",
    "VENDOR_COMMISSION",
    "VENDOR_SUBSCRIPTION",
  ]),
  referenceId: z.string().optional(),
  notes: z.record(z.string(), z.string()).optional(),
  // MARKETPLACE_INSTALLMENT only
  installmentType: z.enum(["ADVANCE", "FINAL"]).optional(),
  quantity: z.number().int().positive().optional(),
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

    const { type, referenceId, notes, installmentType, quantity } = validation.data;
    let { amount } = validation.data;

    // For negotiated marketplace installments, never trust a client-supplied
    // amount - always recompute it server-side from the source record so a
    // tampered client can't pay less than the agreed price.
    if (type === "MARKETPLACE_INSTALLMENT") {
      if (!referenceId || !installmentType) {
        return NextResponse.json(
          { ok: false, error: "referenceId and installmentType are required" },
          { status: 400 }
        );
      }

      if (installmentType === "ADVANCE") {
        if (!quantity) {
          return NextResponse.json({ ok: false, error: "quantity is required" }, { status: 400 });
        }
        const priceUnlockRequest = await db.priceUnlockRequest.findUnique({
          where: { id: referenceId },
        });
        if (
          !priceUnlockRequest ||
          priceUnlockRequest.ownerId !== session.id ||
          priceUnlockRequest.status !== "UNLOCKED" ||
          !priceUnlockRequest.unlockedPrice
        ) {
          return NextResponse.json({ ok: false, error: "No unlocked price found for this request" }, { status: 400 });
        }
        if (priceUnlockRequest.validUntil && priceUnlockRequest.validUntil < new Date()) {
          return NextResponse.json({ ok: false, error: "This price offer has expired" }, { status: 400 });
        }
        if (priceUnlockRequest.quantity != null && quantity > priceUnlockRequest.quantity) {
          return NextResponse.json(
            { ok: false, error: `This negotiated price is only valid for up to ${priceUnlockRequest.quantity} units` },
            { status: 400 }
          );
        }
        amount = computeMarketplaceAdvance(priceUnlockRequest.unlockedPrice * quantity);
      } else {
        const payment = await db.marketplacePayment.findUnique({ where: { id: referenceId } });
        if (
          !payment ||
          payment.ownerId !== session.id ||
          payment.installmentType !== "FINAL" ||
          payment.status !== "PENDING"
        ) {
          return NextResponse.json({ ok: false, error: "No pending final payment found" }, { status: 400 });
        }
        amount = payment.totalAmount;
      }
    }

    // Same reasoning as MARKETPLACE_INSTALLMENT above: a service booking's
    // total already has any discount baked in server-side at creation time
    // (see getEffectiveDiscount / computeBookingTotal). Never trust a
    // client-supplied amount here - always charge exactly what the booking
    // record says, or a stale/tampered client total could over- or
    // under-charge the owner relative to what they actually agreed to.
    if (type === "SERVICE_BOOKING") {
      if (!referenceId) {
        return NextResponse.json({ ok: false, error: "referenceId is required" }, { status: 400 });
      }
      const booking = await db.serviceBooking.findUnique({ where: { id: referenceId } });
      if (!booking) {
        return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
      }
      if (booking.status !== "SLOT_SELECTED" && booking.status !== "PAYMENT_REJECTED") {
        return NextResponse.json({ ok: false, error: "This booking is not payable" }, { status: 400 });
      }
      await requireRestaurantAccess(session, booking.restaurantId, "bookings:update");
      amount = booking.totalAmount;
    }

    if (!amount) {
      return NextResponse.json({ ok: false, error: "Amount is required" }, { status: 400 });
    }

    // Razorpay receipt max 40 chars
    const shortRef = (referenceId || session.id).slice(-8);
    const receipt = `${type.slice(0, 3)}_${shortRef}_${Date.now()}`;

    const order = await createRazorpayOrder(amount, receipt, {
      type,
      userId: session.id,
      // Always carry the source record id through to Razorpay's own order
      // notes - the webhook safety-net path needs this to find the exact
      // record a captured payment belongs to, rather than guessing.
      ...(referenceId ? { referenceId } : {}),
      ...(installmentType ? { installmentType } : {}),
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
