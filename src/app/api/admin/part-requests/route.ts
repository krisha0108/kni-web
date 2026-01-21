import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { PartRequestStatus, PartRequestPriority } from "@prisma/client";

/**
 * GET /api/admin/part-requests
 * Get all part requests with filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const engineerId = searchParams.get("engineerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");

    // Build where clause
    const whereClause: Record<string, unknown> = {};

    if (status && status !== "all") {
      whereClause.status = status.toUpperCase() as PartRequestStatus;
    }

    if (priority && priority !== "all") {
      whereClause.priority = priority.toUpperCase() as PartRequestPriority;
    }

    if (engineerId) {
      whereClause.engineerId = engineerId;
    }

    if (search) {
      whereClause.OR = [
        { partItem: { name: { contains: search } } },
        { engineer: { name: { contains: search } } },
        { reason: { contains: search } },
      ];
    }

    // Fetch part requests with pagination
    const [partRequests, total] = await Promise.all([
      db.partRequest.findMany({
        where: whereClause,
        include: {
          partItem: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
              inventory: {
                select: {
                  currentStock: true,
                },
              },
            },
          },
          engineer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          assignment: {
            select: {
              id: true,
              bookingId: true,
              booking: {
                select: {
                  id: true,
                  restaurant: {
                    select: {
                      id: true,
                      name: true,
                      address: true,
                    },
                  },
                },
              },
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { priority: "desc" }, // URGENT first
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.partRequest.count({ where: whereClause }),
    ]);

    // Get summary counts
    const summary = await db.partRequest.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const summaryMap: Record<string, number> = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0,
    };

    summary.forEach((item) => {
      summaryMap[item.status.toLowerCase()] = item._count.id;
      summaryMap.total += item._count.id;
    });

    return NextResponse.json({
      ok: true,
      data: partRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: summaryMap,
    });
  } catch (error) {
    console.error("Get part requests error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
