import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";
import { z } from "zod";

const recordPaymentSchema = z.object({
  amountPaid: z.number().positive(),
});

const updateSalarySchema = z.object({
  basicSalary: z.number().positive().optional(),
  allowances: z.number().optional(),
  deductions: z.number().optional(),
});

// PATCH /api/owner/staff-salary/[id] - Record payment or update salary
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;
    const body = await request.json();
    const action = request.nextUrl.searchParams.get("action"); // "payment" or "update"

    // Fetch salary record by ID
    const existing = await db.staffSalary.findUnique({
      where: { id },
      include: {
        staff: { select: { name: true } },
        restaurant: { select: { ownerId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Salary record not found" },
        { status: 404 }
      );
    }

    // Verify restaurant access via RBAC
    await requireRestaurantAccess(session, existing.restaurantId, "staff:update");

    if (action === "payment") {
      const validated = recordPaymentSchema.parse(body);

      // Pre-check: reject if payment would obviously exceed total payable
      if (existing.totalPaid + validated.amountPaid > existing.totalPayable) {
        return NextResponse.json(
          { ok: false, error: "Payment amount exceeds total payable" },
          { status: 400 }
        );
      }

      // Use a transaction with atomic increment to prevent race conditions
      const updated = await db.$transaction(async (tx) => {
        const record = await tx.staffSalary.update({
          where: { id },
          data: {
            totalPaid: { increment: validated.amountPaid },
          },
          include: {
            staff: {
              select: {
                id: true,
                name: true,
                designation: true,
                staffType: true,
              },
            },
          },
        });

        // Verify the increment didn't exceed totalPayable
        if (record.totalPaid > record.totalPayable) {
          throw new Error("Payment amount exceeds total payable");
        }

        // AUTO-SYNC: Create Expense entry
        await tx.expense.create({
          data: {
            ownerId: existing.restaurant.ownerId,
            restaurantId: existing.restaurantId,
            category: "SALARIES",
            amount: validated.amountPaid,
            expenseDate: new Date(),
            description: `Salary payment - ${existing.staff.name} (${existing.month}/${existing.year})`,
          },
        });

        // AUTO-SYNC: Create Cashbook entry (expense = cash out)
        await tx.cashbookEntry.create({
          data: {
            ownerId: existing.restaurant.ownerId,
            restaurantId: existing.restaurantId,
            entryDate: new Date(),
            entryType: "CASH_OUT",
            amount: validated.amountPaid,
            paymentMode: "CASH",
            description: `Salary payment - ${existing.staff.name} (${existing.month}/${existing.year})`,
            category: "SALARIES",
            createdBy: existing.restaurant.ownerId,
          },
        });

        // Update status based on actual new totalPaid
        const newStatus = record.totalPaid >= record.totalPayable ? "PAID" : "PARTIALLY_PAID";
        if (record.status !== newStatus) {
          return tx.staffSalary.update({
            where: { id },
            data: { status: newStatus },
            include: {
              staff: {
                select: {
                  id: true,
                  name: true,
                  designation: true,
                  staffType: true,
                },
              },
            },
          });
        }

        return { ...record, status: newStatus };
      });

      const newStatus = updated.totalPaid >= updated.totalPayable ? "PAID" : "PARTIALLY_PAID";

      return NextResponse.json({
        ok: true,
        data: updated,
        message: newStatus === "PAID" ? "Salary fully paid" : "Partial payment recorded",
      });
    } else {
      // Update salary details
      const validated = updateSalarySchema.parse(body);
      const updateData: any = {};

      if (validated.basicSalary !== undefined) {
        updateData.basicSalary = validated.basicSalary;
      }
      if (validated.allowances !== undefined) {
        updateData.allowances = validated.allowances;
      }
      if (validated.deductions !== undefined) {
        updateData.deductions = validated.deductions;
      }

      // Recalculate total payable
      const basicSalary = updateData.basicSalary ?? existing.basicSalary;
      const allowances = updateData.allowances ?? existing.allowances;
      const deductions = updateData.deductions ?? existing.deductions;
      updateData.totalPayable = basicSalary + allowances - deductions;

      // Update status based on new total
      if (existing.totalPaid >= updateData.totalPayable) {
        updateData.status = "PAID";
      } else if (existing.totalPaid > 0) {
        updateData.status = "PARTIALLY_PAID";
      }

      const updated = await db.staffSalary.update({
        where: { id },
        data: updateData,
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              designation: true,
              staffType: true,
            },
          },
        },
      });

      return NextResponse.json({
        ok: true,
        data: updated,
      });
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Salary record not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update salary" },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/owner/staff-salary/[id] - Delete salary record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    // Fetch salary record by ID
    const existing = await db.staffSalary.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Salary record not found" },
        { status: 404 }
      );
    }

    // Verify restaurant access via RBAC
    await requireRestaurantAccess(session, existing.restaurantId, "staff:delete");

    // Only allow deletion if no payment has been made
    if (existing.totalPaid > 0) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete salary record with payments made" },
        { status: 400 }
      );
    }

    await db.staffSalary.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: "Salary record deleted successfully",
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Salary record not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete salary record" },
      { status: error.status || 500 }
    );
  }
}
