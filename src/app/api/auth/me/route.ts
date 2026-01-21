import { NextRequest, NextResponse } from "next/server";
import { getMobileSession } from "@/server/auth/mobile-session";
import { getRoleDashboardUrl } from "@/server/auth/rbac";

/**
 * GET /api/auth/me
 * Get current user session
 * Supports both cookie-based (web) and token-based (mobile) authentication
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        user: session,
        redirectUrl: getRoleDashboardUrl(session.role, session),
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
