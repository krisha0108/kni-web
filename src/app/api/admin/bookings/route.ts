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

    const where = status ? { status: status as any } : {};

    const [items, total] = await Promise.all([
      db.serviceBooking.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          restaurant: { select: { id: true, name: true, city: true } },
          paymentProof: true,
          items: {
            include: {
              serviceItem: {
                include: { category: { select: { id: true, name: true } } },
              },
              partItem: {
                include: { category: { select: { id: true, name: true } } },
              },
            },
          },
          engineerAssignments: {
            include: {
              engineer: { select: { id: true, name: true } },
              workLog: true
            },
            orderBy: { assignedAt: 'desc' },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.serviceBooking.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get admin bookings error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
