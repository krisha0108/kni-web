import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateVendorSchema = z.object({
  vendorId: z.string().nullable().optional(),
  vendorPaymentAmount: z.number().int().nonnegative().nullable().optional(),
  vendorPaymentStatus: z.enum(["PENDING", "COMPLETE"]).optional(),
});

/**
 * PATCH /api/admin/amc-requests/[id]/vendor
 * Assign/change the vendor fulfilling this AMC request, set how much they're
 * owed, and/or toggle whether that payment is done. Independent of the
 * AMCRequestStatus state machine in the generic PATCH route.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = updateVendorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ ok: false, error: validation.error.issues[0].message }, { status: 400 });
    }

    const existing = await db.aMCRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "AMC request not found" }, { status: 404 });
    }

    const { vendorId, vendorPaymentAmount, vendorPaymentStatus } = validation.data;

    const updated = await db.aMCRequest.update({
      where: { id },
      data: {
        ...(vendorId !== undefined && { vendorId }),
        ...(vendorPaymentAmount !== undefined && { vendorPaymentAmount }),
        ...(vendorPaymentStatus !== undefined && { vendorPaymentStatus }),
      },
      include: {
        vendor: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Update AMC request vendor error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
