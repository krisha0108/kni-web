import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/app_api/guides
 * Public endpoint to fetch tutorial guides for mobile app
 * Returns guides with thumbnails, titles, duration, and links
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const perPage = Number(searchParams.get("per_page")) || 10;

    // Query active guides from database
    const guides = await db.guide.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      take: perPage,
    });

    // Format for mobile app
    const formatted = guides.map((g) => ({
      id: g.id,
      thumb_url: g.thumbUrl,
      title: g.title,
      minutes: g.minutes,
      link: g.linkUrl,
      created_at: g.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Get guides error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch guides" },
      { status: 500 }
    );
  }
}
