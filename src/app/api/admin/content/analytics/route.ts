import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/content/analytics
 * Get comprehensive analytics for all content types
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const days = Number(searchParams.get("days")) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Banner Analytics
    const [totalBanners, publishedBanners, draftBanners, archivedBanners] = await Promise.all([
      db.banner.count(),
      db.banner.count({ where: { status: "PUBLISHED" } }),
      db.banner.count({ where: { status: "DRAFT" } }),
      db.banner.count({ where: { status: "ARCHIVED" } }),
    ]);

    const recentBanners = await db.banner.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
    });

    // Feed Analytics
    const [totalFeeds, activeFeeds] = await Promise.all([
      db.feed.count(),
      db.feed.count({ where: { isActive: true } }),
    ]);

    const recentFeeds = await db.feed.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        text: true,
        tone: true,
        isActive: true,
        createdAt: true,
      },
    });

    const feedsByTone = await db.feed.groupBy({
      by: ["tone"],
      _count: { id: true },
      where: { isActive: true },
    });

    // Guide Analytics
    const [totalGuides, activeGuides] = await Promise.all([
      db.guide.count(),
      db.guide.count({ where: { isActive: true } }),
    ]);

    const recentGuides = await db.guide.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        minutes: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Sponsored Content Analytics
    const now = new Date();
    const [totalSponsored, activeSponsored, expiredSponsored] = await Promise.all([
      db.sponsoredContent.count(),
      db.sponsoredContent.count({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
      db.sponsoredContent.count({
        where: {
          endDate: { lt: now },
        },
      }),
    ]);

    const sponsoredPerformance = await db.sponsoredContent.findMany({
      orderBy: [
        { impressions: "desc" },
        { clicks: "desc" },
      ],
      take: 10,
      select: {
        id: true,
        title: true,
        type: true,
        impressions: true,
        clicks: true,
        startDate: true,
        endDate: true,
        sponsoredBy: true,
      },
    });

    // Calculate CTR (Click-Through Rate) for sponsored content
    const sponsoredWithCTR = sponsoredPerformance.map((item) => ({
      ...item,
      ctr: item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) : "0.00",
    }));

    const totalImpressions = await db.sponsoredContent.aggregate({
      _sum: { impressions: true },
      where: { isActive: true },
    });

    const totalClicks = await db.sponsoredContent.aggregate({
      _sum: { clicks: true },
      where: { isActive: true },
    });

    // Content creation trends (last 30 days)
    const contentTrends = await Promise.all([
      db.banner.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        where: { createdAt: { gte: startDate } },
      }),
      db.feed.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        where: { createdAt: { gte: startDate } },
      }),
      db.guide.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        where: { createdAt: { gte: startDate } },
      }),
      db.sponsoredContent.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        where: { createdAt: { gte: startDate } },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        overview: {
          banners: {
            total: totalBanners,
            published: publishedBanners,
            draft: draftBanners,
            archived: archivedBanners,
          },
          feeds: {
            total: totalFeeds,
            active: activeFeeds,
            inactive: totalFeeds - activeFeeds,
          },
          guides: {
            total: totalGuides,
            active: activeGuides,
            inactive: totalGuides - activeGuides,
          },
          sponsored: {
            total: totalSponsored,
            active: activeSponsored,
            expired: expiredSponsored,
          },
        },
        performance: {
          sponsored: {
            topPerforming: sponsoredWithCTR,
            totalImpressions: totalImpressions._sum.impressions || 0,
            totalClicks: totalClicks._sum.clicks || 0,
            overallCTR: totalImpressions._sum.impressions
              ? ((totalClicks._sum.clicks || 0) / totalImpressions._sum.impressions * 100).toFixed(2)
              : "0.00",
          },
        },
        recent: {
          banners: recentBanners,
          feeds: recentFeeds,
          guides: recentGuides,
        },
        insights: {
          feedsByTone: feedsByTone.map((item) => ({
            tone: item.tone,
            count: item._count.id,
          })),
        },
        trends: {
          last30Days: {
            banners: contentTrends[0].length,
            feeds: contentTrends[1].length,
            guides: contentTrends[2].length,
            sponsored: contentTrends[3].length,
          },
        },
      },
    });
  } catch (error: any) {
    console.error("Get content analytics error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
