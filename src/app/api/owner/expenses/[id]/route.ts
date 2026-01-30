import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { expenseUpdateSchema } from "@/server/validators/expense";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const expense = await db.expense.findFirst({
      where: {
        id,
        ownerId: session.id,
        deletedAt: null,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { ok: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: expense,
    });
  } catch (error) {
    console.error("Get expense error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const body = await request.json();
    const validation = expenseUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if expense exists and belongs to owner
    const existingExpense = await db.expense.findFirst({
      where: {
        id,
        ownerId: session.id,
        deletedAt: null,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { ok: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (validation.data.category !== undefined) updateData.category = validation.data.category;
    if (validation.data.amount !== undefined)
      updateData.amount = validation.data.amount;
    if (validation.data.expenseDate !== undefined)
      updateData.expenseDate = new Date(validation.data.expenseDate);
    if (validation.data.description !== undefined)
      updateData.description = validation.data.description;
    if (validation.data.receiptImageUrl !== undefined)
      updateData.receiptImageUrl = validation.data.receiptImageUrl;

    const expense = await db.expense.update({
      where: { id },
      data: updateData,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: expense });
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    // Check if expense exists and belongs to owner
    const existingExpense = await db.expense.findFirst({
      where: {
        id,
        ownerId: session.id,
        deletedAt: null,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { ok: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await db.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true, data: { message: "Expense deleted successfully" } });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
