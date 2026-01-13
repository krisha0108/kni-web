import { NextRequest, NextResponse } from "next/server";
import { getTopRatedVendors } from "@/server/ratings/service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    const topVendors = await getTopRatedVendors(limit);

    return NextResponse.json({
      ok: true,
      data: topVendors,
    });
  } catch (error: any) {
    console.error("Top vendors error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
