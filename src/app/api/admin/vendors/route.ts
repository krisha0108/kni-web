import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const where = status
      ? { vendorProfile: { approvalStatus: status as any } }
      : {};

    const vendors = await db.user.findMany({
      where: {
        role: "VENDOR",
        isActive: true,
        ...where,
      },
      include: {
        vendorProfile: true,
        _count: { select: { vendorProducts: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: vendors });
  } catch (error) {
    console.error("Get vendors error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
