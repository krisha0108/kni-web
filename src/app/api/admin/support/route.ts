import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {};

    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    if (category && category !== "all") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { owner: { name: { contains: search } } },
        { owner: { email: { contains: search } } },
      ];
    }

    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          restaurant: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              threads: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.supportTicket.count({ where }),
    ]);

    // Get status counts for summary
    const statusCounts = await db.supportTicket.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const summary = {
      total,
      pending: statusCounts.find((s) => s.status === "PENDING")?._count.status || 0,
      seen: statusCounts.find((s) => s.status === "SEEN")?._count.status || 0,
      onWork: statusCounts.find((s) => s.status === "ON_WORK")?._count.status || 0,
      completed: statusCounts.find((s) => s.status === "COMPLETED")?._count.status || 0,
      rejected: statusCounts.find((s) => s.status === "REJECTED")?._count.status || 0,
    };

    return NextResponse.json({
      ok: true,
      data: tickets,
      summary,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Get support tickets error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
