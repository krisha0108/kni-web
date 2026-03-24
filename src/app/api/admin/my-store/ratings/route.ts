import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/rbac";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Find system vendor (KNI Store) to show its ratings
    const systemVendor = await db.vendorProfile.findFirst({
      where: { isSystemVendor: true },
      select: { userId: true },
    });

    const where = {
      isPublished: true,
      ...(systemVendor ? { vendorId: systemVendor.userId } : {}),
    };

    const [ratings, total] = await Promise.all([
      db.vendorRating.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          owner: { select: { name: true } },
          restaurant: { select: { name: true, city: true } },
          order: { select: { id: true, createdAt: true } },
        },
      }),
      db.vendorRating.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        ratings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Admin store ratings fetch error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
