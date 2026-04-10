import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {};
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      where.status = status;
    }

    const [categoryRequests, total] = await Promise.all([
      db.categoryRequest.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          restaurant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.categoryRequest.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: categoryRequests, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get category requests error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
