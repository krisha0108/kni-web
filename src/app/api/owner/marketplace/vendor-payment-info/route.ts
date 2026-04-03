import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireOwnerMobile(request);

    const vendorId = request.nextUrl.searchParams.get("vendorId");
    if (!vendorId) {
      return NextResponse.json(
        { ok: false, error: "vendorId is required" },
        { status: 400 }
      );
    }

    const profile = await db.vendorProfile.findUnique({
      where: { userId: vendorId },
      select: {
        paymentQrCodeUrl: true,
        paymentUpiId: true,
        paymentAccountName: true,
        isSystemVendor: true,
        user: { select: { name: true } },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        vendorName: profile.user.name,
        paymentQrCodeUrl: profile.paymentQrCodeUrl,
        paymentUpiId: profile.paymentUpiId,
        paymentAccountName: profile.paymentAccountName,
        useRazorpay: profile.isSystemVendor === true,
      },
    });
  } catch (error) {
    console.error("Get vendor payment info error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
