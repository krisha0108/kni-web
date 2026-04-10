import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.vendorLocationRequest.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: requests, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get location requests error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
