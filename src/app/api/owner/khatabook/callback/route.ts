import { NextRequest, NextResponse } from "next/server";
import { createKhatabookConnection } from "@/server/khatabook/service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth error
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/owner/settings/khatabook?error=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    // Validate parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          "/owner/settings/khatabook?error=missing_parameters",
          request.url
        )
      );
    }

    // Decode state to get user ID and restaurant ID
    const stateData = JSON.parse(Buffer.from(state, "base64").toString());
    const { userId, restaurantId } = stateData;

    // Create Khatabook connection
    await createKhatabookConnection({
      userId,
      restaurantId,
      code,
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL("/owner/settings/khatabook?success=true", request.url)
    );
  } catch (error) {
    console.error("Khatabook OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        "/owner/settings/khatabook?error=connection_failed",
        request.url
      )
    );
  }
}
