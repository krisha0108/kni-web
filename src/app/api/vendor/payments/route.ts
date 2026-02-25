import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendorMobile } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireVendorMobile(request);
    const status = request.nextUrl.searchParams.get("status");

    const payments = await db.marketplacePayment.findMany({
      where: {
        vendorId: session.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        restaurant: { select: { id: true, name: true, city: true } },
        order: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: payments });
  } catch (error) {
    console.error("Get vendor payments error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
