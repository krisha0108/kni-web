import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all"; // all, active, inactive
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {
      role: "OWNER",
      deletedAt: null,
    };

    // Status filter
    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    // Get owners with restaurant count
    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              restaurants: true,
              serviceBookings: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    // Get stats for the summary cards
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalOwners, activeOwners, inactiveOwners, newThisMonth] = await Promise.all([
      db.user.count({
        where: { role: "OWNER", deletedAt: null },
      }),
      db.user.count({
        where: { role: "OWNER", isActive: true, deletedAt: null },
      }),
      db.user.count({
        where: { role: "OWNER", isActive: false, deletedAt: null },
      }),
      db.user.count({
        where: {
          role: "OWNER",
          deletedAt: null,
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    // Transform items to include computed fields
    const transformedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      isActive: item.isActive,
      createdAt: item.createdAt,
      restaurantCount: item._count.restaurants,
      totalBookings: item._count.serviceBookings,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        items: transformedItems,
        total,
        page,
        pageSize,
        stats: {
          totalOwners,
          activeOwners,
          inactiveOwners,
          newThisMonth,
        },
      },
    });
  } catch (error) {
    console.error("Get owners error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
