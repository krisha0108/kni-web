import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/rbac";
import { generateBookingInvoice } from "@/server/pdf/invoice-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const params = await context.params;
    const { id: bookingId } = params;

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
    console.error("Generate booking invoice error (admin):", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
