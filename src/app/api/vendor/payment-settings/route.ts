import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendorMobile } from "@/server/auth/rbac";
import { z } from "zod";

const updateSchema = z.object({
  paymentQrCodeUrl: z.string().optional(),
  paymentUpiId: z.string().optional(),
  paymentAccountName: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireVendorMobile(request);

    const profile = await db.vendorProfile.findUnique({
      where: { userId: session.id },
      select: {
        paymentQrCodeUrl: true,
        paymentUpiId: true,
        paymentAccountName: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: profile });
  } catch (error) {
    console.error("Get vendor payment settings error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireVendorMobile(request);

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
    console.error("Update vendor payment settings error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
