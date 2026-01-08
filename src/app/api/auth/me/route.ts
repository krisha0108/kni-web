import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getRoleDashboardUrl } from "@/server/auth/rbac";

export async function GET() {
  try {
    const session = await getSession();

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
