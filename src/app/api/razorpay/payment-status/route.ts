import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRoleMobile } from "@/server/auth/rbac";
import { Role } from "@prisma/client";

/**
 * Payment Status Polling Endpoint
 * Used by mobile app to check if a Razorpay payment was processed
 * (e.g., after verify retries fail but webhook may have processed it).
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoleMobile(request, Role.OWNER, Role.ADMIN, Role.VENDOR);

    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId query parameter is required" },
        { status: 400 }
      );
    }

    // Check across all payment tables for this razorpayOrderId
    const [marketplacePayment, paymentProof, amcPayment, commissionCollection, subscriptionRequest] =
      await Promise.all([
        db.marketplacePayment.findFirst({
          where: { razorpayOrderId: orderId },
          select: { status: true, orderId: true },
        }),
        db.paymentProof.findFirst({
          where: { razorpayOrderId: orderId },
          select: { status: true, bookingId: true },
        }),
        db.aMCPayment.findFirst({
          where: { razorpayOrderId: orderId },
          select: { status: true, id: true },
        }),
        db.vendorCommissionCollection.findFirst({
          where: { razorpayOrderId: orderId },
          select: { status: true, id: true },
        }),
        db.vendorSubscriptionRequest.findFirst({
          where: { razorpayOrderId: orderId },
          select: { status: true, id: true },
        }),
      ]);

    if (marketplacePayment) {
      return NextResponse.json({
        ok: true,
        data: { status: marketplacePayment.status, type: "MARKETPLACE", orderId: marketplacePayment.orderId },
      });
    }
    if (paymentProof) {
      return NextResponse.json({
        ok: true,
        data: { status: paymentProof.status, type: "SERVICE_BOOKING", bookingId: paymentProof.bookingId },
      });
    }
    if (amcPayment) {
      return NextResponse.json({
        ok: true,
        data: { status: amcPayment.status, type: "AMC_PAYMENT", id: amcPayment.id },
      });
    }
    if (commissionCollection) {
      return NextResponse.json({
        ok: true,
        data: { status: commissionCollection.status, type: "VENDOR_COMMISSION", id: commissionCollection.id },
      });
    }
    if (subscriptionRequest) {
      return NextResponse.json({
        ok: true,
        data: { status: subscriptionRequest.status, type: "VENDOR_SUBSCRIPTION", id: subscriptionRequest.id },
      });
    }

    return NextResponse.json({
      ok: true,
      data: { status: "NOT_FOUND" },
    });
  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to check payment status" },
      { status: 500 }
    );
  }
}
