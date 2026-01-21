import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/app_api/feeds
 * Public endpoint to fetch news/announcement feeds for mobile app
 * Returns feeds with tone (ok, info, warn, danger) and icons
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const perPage = Number(searchParams.get("per_page")) || 10;

    // Query active feeds from database
    const feeds = await db.feed.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: perPage,
    });

    // Format for mobile app
    const formatted = feeds.map((f) => ({
      id: f.id,
      txt: f.text,
      tone: f.tone.toLowerCase(),
      icon: f.icon || undefined,
      created_at: f.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Get feeds error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch feeds" },
      { status: 500 }
    );
  }
}
