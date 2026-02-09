import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/server/auth/rbac";
import { getVendorStats } from "@/server/ratings/service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireVendor();

    const stats = await getVendorStats(session.id);

    return NextResponse.json({
      ok: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Vendor stats error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
