import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/rbac";
import { generateOrderInvoice } from "@/server/pdf/invoice-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const params = await context.params;
    const { id: orderId } = params;

    // Generate PDF invoice
    const pdfBuffer = await generateOrderInvoice(orderId);

    // Return PDF with appropriate headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="order-invoice-${orderId.slice(-8)}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Generate order invoice error (admin):", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
