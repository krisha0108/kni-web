import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { generateOrderInvoice } from "@/server/pdf/invoice-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVendor();
    const params = await context.params;
    const { id: orderId } = params;

    // Verify the order belongs to the vendor
    const order = await db.marketplaceOrder.findUnique({
      where: { id: orderId },
      select: { vendorId: true, status: true },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.vendorId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Allow invoice generation for confirmed and delivered orders
    const allowedStatuses = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invoice can only be generated for confirmed or delivered orders",
        },
        { status: 400 }
      );
    }

    // Generate PDF invoice
    const pdfBuffer = await generateOrderInvoice(orderId);

    // Return PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="order-invoice-${orderId.slice(-8)}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Generate order invoice error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
