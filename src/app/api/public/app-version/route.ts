import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

// GET - Fetch the current app-version / force-update config (Public - no auth
// required; the mobile app calls this on every launch, before login).
// Query params: app ("owner" | "engineer", default "owner"), platform
// ("android" | "ios", default "android").
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appKey = searchParams.get("app") || "owner";
    const platform = searchParams.get("platform") || "android";

    const config = await db.appVersionConfig.findUnique({
      where: { appKey_platform: { appKey, platform } },
      select: {
        latestVersionCode: true,
        latestVersionName: true,
        minSupportedVersionCode: true,
        forceUpdate: true,
        updateMessage: true,
        storeUrl: true,
      },
    });

    if (!config) {
      // Not configured yet - app should treat this as "no update required"
      // rather than failing closed and blocking everyone.
      return NextResponse.json(
        { ok: false, error: "App version not configured" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: config });
  } catch (error) {
    console.error("Get public app-version error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch app version config" },
      { status: 500 }
    );
  }
}
