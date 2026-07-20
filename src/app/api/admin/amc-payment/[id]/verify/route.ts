import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { activateAMCContract } from "@/server/amc/activate-contract";

/**
 * POST /api/admin/amc-payment/[id]/verify
 * Admin verifies payment → Contract gets created
 * [id] = AMCPayment ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const payment = await db.aMCPayment.findUnique({ where: { id } });

    if (!payment) {
      return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "UPLOADED") {
      return NextResponse.json({ ok: false, error: "Only UPLOADED payments can be verified" }, { status: 400 });
    }

    const { contract } = await activateAMCContract(id, {
      verifiedById: session.id,
      paymentMethod: "SCREENSHOT",
    });

    return NextResponse.json({ ok: true, data: contract });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
