import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { autoUpdateBannerStatuses } from "@/server/utils/auto-status-update";
import { BannerStatus } from "@prisma/client";

/**
 * GET /api/app_api/banners
 * Public endpoint to fetch banners for mobile app home screen
 * Returns published banners sorted by sort_order
 */
export async function GET(request: NextRequest) {
  try {
    // Auto-update banner statuses based on dates
    await autoUpdateBannerStatuses();

    const searchParams = request.nextUrl.searchParams;
    const perPage = Number(searchParams.get("per_page")) || 10;
    const status = searchParams.get("status") || "published";

    const now = new Date();

    // Query active banners from database
    const banners = await db.banner.findMany({
      where: {
        status: status.toUpperCase() as BannerStatus,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
        ],
      },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      take: perPage,
    });

    // Format for mobile app (map DB fields to what the app expects)
    const formatted = banners.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.description,
      description: b.description,
      image_url: b.imageUrl,
      link: b.linkUrl,
      cta_link: b.linkUrl,
      cta_text: b.linkUrl ? 'Learn More' : null,
      badge: null,
      status: b.status.toLowerCase(),
      sort_order: b.sortOrder,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Get banners error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch banners" },
      { status: 500 }
    );
  }
}
