import { NextRequest, NextResponse } from "next/server";
import { requireEngineer } from "@/server/auth/permissions";
import { getEngineerStats } from "@/server/ratings/service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineer();

    const stats = await getEngineerStats(session.id);

    return NextResponse.json({
      ok: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Engineer stats error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
