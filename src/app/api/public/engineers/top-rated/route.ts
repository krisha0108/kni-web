import { NextRequest, NextResponse } from "next/server";
import { getTopRatedEngineers } from "@/server/ratings/service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    const topEngineers = await getTopRatedEngineers(limit);

    return NextResponse.json({
      ok: true,
      data: topEngineers,
    });
  } catch (error: any) {
    console.error("Top engineers error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
