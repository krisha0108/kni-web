import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
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

    // Check ownership
    const existing = await db.staffSalary.findFirst({
      where: {
        id,
        staff: {
          ownerId: session.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Salary record not found or access denied" },
        { status: 404 }
      );
    }

    if (action === "payment") {
      const validated = recordPaymentSchema.parse(body);
      const newTotalPaid = existing.totalPaid + validated.amountPaid;

      if (newTotalPaid > existing.totalPayable) {
        return NextResponse.json(
          { ok: false, error: "Payment amount exceeds total payable" },
          { status: 400 }
        );
      }

      const newStatus = newTotalPaid >= existing.totalPayable ? "PAID" : "PARTIALLY_PAID";

      const updated = await db.staffSalary.update({
        where: { id },
        data: {
          totalPaid: newTotalPaid,
          status: newStatus,
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
        { ok: false, error: error.errors[0].message },
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

    // Check ownership
    const existing = await db.staffSalary.findFirst({
      where: {
        id,
        staff: {
          ownerId: session.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Salary record not found or access denied" },
        { status: 404 }
      );
    }

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
