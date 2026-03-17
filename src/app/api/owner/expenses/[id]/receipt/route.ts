import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { generateExpenseReceipt } from "@/server/pdf/document-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const params = await context.params;
    const { id: expenseId } = params;

    // Verify the expense exists and belongs to the user
    const expense = await db.expense.findFirst({
      where: {
        id: expenseId,
        deletedAt: null,
      },
      select: { ownerId: true },
    });

    if (!expense) {
      return NextResponse.json(
        { ok: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    if (expense.ownerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Generate PDF receipt
    const pdfBuffer = await generateExpenseReceipt(expenseId);

    // Return PDF with appropriate headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="expense-receipt-${expenseId.slice(-8)}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Generate expense receipt error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate receipt" },
      { status: 500 }
    );
  }
}
