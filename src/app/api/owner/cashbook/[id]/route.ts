import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
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

    // Fetch record and check RBAC
    const existing = await db.cashbookEntry.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Entry not found" },
        { status: 404 }
      );
    }

    await requireRestaurantAccess(session, existing.restaurantId, "expenses:update");

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
        { ok: false, error: error.issues[0].message },
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
      { status: error.message?.includes("Unauthorized") ? 401 : (error.status || 500) }
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

    // Fetch record and check RBAC
    const existing = await db.cashbookEntry.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Entry not found" },
        { status: 404 }
      );
    }

    await requireRestaurantAccess(session, existing.restaurantId, "expenses:delete");

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
      { status: error.message?.includes("Unauthorized") ? 401 : (error.status || 500) }
    );
  }
}
