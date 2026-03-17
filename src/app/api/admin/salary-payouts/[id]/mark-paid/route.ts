import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const markPaidSchema = z.object({
  paymentNote: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const validation = markPaidSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { paymentNote } = validation.data;

    const payout = await db.salaryPayout.findUnique({ where: { id } });

    if (!payout) {
      return NextResponse.json(
        { ok: false, error: "Salary payout not found" },
        { status: 404 }
      );
    }

    if (payout.status === "PAID") {
      return NextResponse.json(
        { ok: false, error: "Salary payout is already marked as paid" },
        { status: 400 }
      );
    }

    const updated = await db.salaryPayout.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentNote: paymentNote || null,
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Mark salary payout as paid error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to mark salary payout as paid" },
      { status: 500 }
    );
  }
}
