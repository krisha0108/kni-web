import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { generateBookingInvoice } from "@/server/pdf/invoice-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const params = await context.params;
    const { id: bookingId } = params;

    // Verify the booking belongs to the user
    const booking = await db.serviceBooking.findUnique({
      where: { id: bookingId },
      select: { ownerId: true, status: true },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.ownerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Only allow invoice generation for bookings that have been completed or payment verified
    const allowedStatuses = [
      "PAYMENT_VERIFIED",
      "ENGINEER_ASSIGNED",
      "ACCEPTED_BY_ENGINEER",
      "COMPLETED",
    ];

    if (!allowedStatuses.includes(booking.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invoice can only be generated for bookings with verified payment",
        },
        { status: 400 }
      );
    }

    // Generate PDF invoice
    const pdfBuffer = await generateBookingInvoice(bookingId);

    // Return PDF with appropriate headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="booking-invoice-${bookingId.slice(-8)}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Generate booking invoice error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
