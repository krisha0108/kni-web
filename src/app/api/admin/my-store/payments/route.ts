import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { getOrCreateSystemVendor } from "@/server/my-store";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    await getOrCreateSystemVendor(session.id);

    const status = request.nextUrl.searchParams.get("status");

    const payments = await db.marketplacePayment.findMany({
      where: {
        vendorId: session.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, phone: true, email: true } },
        restaurant: { select: { id: true, name: true, city: true, address: true } },
        order: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: payments });
  } catch (error) {
    console.error("Get admin store payments error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
