import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const appVersionSchema = z.object({
  appKey: z.string().min(1).default("owner"),
  platform: z.string().min(1).default("android"),
  latestVersionCode: z.coerce.number().int().positive(),
  latestVersionName: z.string().min(1, "Latest version name is required"),
  minSupportedVersionCode: z.coerce.number().int().positive(),
  forceUpdate: z.boolean().default(true),
  updateMessage: z.string().min(1, "Update message is required"),
  storeUrl: z.string().url("A valid Play Store URL is required"),
});

// GET - Fetch current app-version config (Admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const appKey = searchParams.get("app") || "owner";
    const platform = searchParams.get("platform") || "android";

    const config = await db.appVersionConfig.findUnique({
      where: { appKey_platform: { appKey, platform } },
    });

    return NextResponse.json({ ok: true, data: config });
  } catch (error) {
    console.error("Get admin app-version error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch app version config" },
      { status: 500 }
    );
  }
}

// POST - Create or update the app-version config (Admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = appVersionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      appKey,
      platform,
      latestVersionCode,
      latestVersionName,
      minSupportedVersionCode,
      forceUpdate,
      updateMessage,
      storeUrl,
    } = validation.data;

    if (minSupportedVersionCode > latestVersionCode) {
      return NextResponse.json(
        { ok: false, error: "Minimum supported version cannot be newer than the latest version" },
        { status: 400 }
      );
    }

    const config = await db.appVersionConfig.upsert({
      where: { appKey_platform: { appKey, platform } },
      update: {
        latestVersionCode,
        latestVersionName,
        minSupportedVersionCode,
        forceUpdate,
        updateMessage,
        storeUrl,
      },
      create: {
        appKey,
        platform,
        latestVersionCode,
        latestVersionName,
        minSupportedVersionCode,
        forceUpdate,
        updateMessage,
        storeUrl,
      },
    });

    return NextResponse.json({ ok: true, data: config });
  } catch (error) {
    console.error("Update admin app-version error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update app version config" },
      { status: 500 }
    );
  }
}
