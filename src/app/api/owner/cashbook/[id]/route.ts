import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { z } from "zod";

const updateEntrySchema = z.object({
  entryType: z.enum(["CASH_IN", "CASH_OUT", "BANK_IN", "BANK_OUT"]).optional(),
  amount: z.number().positive().optional(),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD", "OTHER"]).optional(),
  category: z.string().optional(),
  description: z.string().min(1).optional(),
  referenceNo: z.string().optional(),
  entryDate: z.string().optional(),
});

// PATCH /api/owner/cashbook/[id] - Update cashbook entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;
    const body = await request.json();
    const validated = updateEntrySchema.parse(body);

    // Check ownership
    const existing = await db.cashbookEntry.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Entry not found or access denied" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (validated.entryType) updateData.entryType = validated.entryType;
    if (validated.amount) updateData.amount = validated.amount;
    if (validated.paymentMode) updateData.paymentMode = validated.paymentMode;
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.description) updateData.description = validated.description;
    if (validated.referenceNo !== undefined) updateData.referenceNo = validated.referenceNo;
    if (validated.entryDate) updateData.entryDate = new Date(validated.entryDate);

    const entry = await db.cashbookEntry.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      data: entry,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Entry not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update entry" },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/owner/cashbook/[id] - Delete cashbook entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    // Check ownership
    const existing = await db.cashbookEntry.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Entry not found or access denied" },
        { status: 404 }
      );
    }

    await db.cashbookEntry.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: "Entry deleted successfully",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Entry not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete entry" },
      { status: error.status || 500 }
    );
  }
}
