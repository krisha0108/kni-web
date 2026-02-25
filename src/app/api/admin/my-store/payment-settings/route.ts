import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { getOrCreateSystemVendor } from "@/server/my-store";
import { z } from "zod";

const updateSchema = z.object({
  paymentQrCodeUrl: z.string().nullable().optional(),
  paymentUpiId: z.string().nullable().optional(),
  paymentAccountName: z.string().nullable().optional(),
});

// GET - Fetch admin's marketplace payment settings (from VendorProfile)
export async function GET() {
  try {
    const session = await requireAdmin();
    await getOrCreateSystemVendor(session.id);

    const profile = await db.vendorProfile.findUnique({
      where: { userId: session.id },
      select: {
        paymentQrCodeUrl: true,
        paymentUpiId: true,
        paymentAccountName: true,
      },
    });

    return NextResponse.json({ ok: true, data: profile });
  } catch (error) {
    console.error("Get admin store payment settings error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update admin's marketplace payment settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    await getOrCreateSystemVendor(session.id);

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const profile = await db.vendorProfile.update({
      where: { userId: session.id },
      data: validation.data,
      select: {
        paymentQrCodeUrl: true,
        paymentUpiId: true,
        paymentAccountName: true,
      },
    });

    return NextResponse.json({ ok: true, data: profile });
  } catch (error) {
    console.error("Update admin store payment settings error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
