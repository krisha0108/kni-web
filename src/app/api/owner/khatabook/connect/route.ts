import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/server/auth/permissions";
import { generateAuthorizationUrl } from "@/server/khatabook/service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId") || undefined;

    // Generate Khatabook OAuth authorization URL
    const authUrl = generateAuthorizationUrl(session.id, restaurantId);

    return NextResponse.json({
      ok: true,
      data: {
        authorizationUrl: authUrl,
      },
    });
  } catch (error: any) {
    console.error("Generate Khatabook auth URL error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
