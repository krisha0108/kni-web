import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const planId = searchParams.get("planId");
    const ownerId = searchParams.get("ownerId");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {
      ...(status ? { status: status as any } : {}),
      ...(planId ? { planId } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(search ? {
        OR: [
          { owner: { name: { contains: search } } },
          { owner: { email: { contains: search } } },
          { restaurant: { name: { contains: search } } },
        ],
      } : {}),
    };

    const [subscriptions, total] = await Promise.all([
      db.aMCSubscription.findMany({
        where,
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              duration: true,
              serviceLimit: true,
            },
          },
          equipment: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
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
              address: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.aMCSubscription.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { subscriptions, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get AMC subscriptions error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
