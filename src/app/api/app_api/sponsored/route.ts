import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/app_api/sponsored
 * Public endpoint to fetch sponsored content for mobile app
 * Returns sponsored vendors/products/services
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    // Query active sponsored content
    const sponsored = await db.sponsoredContent.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Increment impressions for analytics
    if (sponsored.length > 0) {
      await db.sponsoredContent.updateMany({
        where: {
          id: { in: sponsored.map((s) => s.id) },
        },
        data: {
          impressions: { increment: 1 },
        },
      });
    }

    // Format for mobile app
    const formatted = sponsored.map((s) => ({
      id: s.id,
      type: s.type.toLowerCase(),
      title: s.title,
      description: s.description,
      image_url: s.imageUrl,
      link: s.linkUrl,
      sponsored_by: s.sponsoredBy,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Get sponsored error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch sponsored content" },
      { status: 500 }
    );
  }
}
