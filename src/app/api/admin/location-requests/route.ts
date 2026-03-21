import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { vendor: { name: { contains: search } } },
        { area: { name: { contains: search } } },
        { area: { city: { name: { contains: search } } } },
      ];
    }

    const [requests, total] = await Promise.all([
      db.vendorLocationRequest.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, name: true, email: true },
          },
          area: {
            select: {
              id: true,
              name: true,
              city: {
                select: {
                  id: true,
                  name: true,
                  state: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      page > 0 ? db.vendorLocationRequest.count({ where }) : Promise.resolve(-1),
    ]);

    return NextResponse.json({
      ok: true,
      data: page > 0 ? { items: requests, total, page, pageSize } : { items: requests },
    });
  } catch (error) {
    console.error("Get location requests error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
