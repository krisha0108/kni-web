import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

/**
 * GET /api/restaurant-owner/equipment-requests/[orderId]/payment
 * Fetch payment details for a specific booking/order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { orderId } = await params;

    // Find the booking
    const booking = await db.serviceBooking.findFirst({
      where: {
        id: orderId,
        ownerId: session.id,
      },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        paymentProof: {
          select: {
            id: true,
            screenshotUrl: true,
            adminNote: true,
            status: true,
            createdAt: true,
            verifiedAt: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Format payment info
    const paymentInfo = booking.paymentProof
      ? {
          id: booking.paymentProof.id,
          amount: booking.totalAmount,
          payment_status: booking.paymentProof.status || "pending",
          payment_method: "UPI",
          payment_note: booking.paymentProof.adminNote,
          payment_screenshot: booking.paymentProof.screenshotUrl,
          transaction_id: booking.paymentProof.id,
          created_at: booking.paymentProof.createdAt?.toISOString(),
          verified_at: booking.paymentProof.verifiedAt?.toISOString(),
        }
      : null;

    return NextResponse.json(paymentInfo);
  } catch (error: any) {
    console.error("Get payment details error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
