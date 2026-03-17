import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const businessType = searchParams.get("businessType");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (priority && priority !== "all") {
      where.priority = priority;
    }

    if (businessType && businessType !== "all") {
      where.businessType = businessType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { city: { contains: search } },
        { businessName: { contains: search } },
      ];
    }

    const [inquiries, total] = await Promise.all([
      db.launchPadInquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.launchPadInquiry.count({ where }),
    ]);

    // Get status counts for summary
    const statusCounts = await db.launchPadInquiry.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const summary = {
      total,
      new: statusCounts.find((s) => s.status === "NEW")?._count.status || 0,
      contacted: statusCounts.find((s) => s.status === "CONTACTED")?._count.status || 0,
      qualified: statusCounts.find((s) => s.status === "QUALIFIED")?._count.status || 0,
      proposalSent: statusCounts.find((s) => s.status === "PROPOSAL_SENT")?._count.status || 0,
      negotiation: statusCounts.find((s) => s.status === "NEGOTIATION")?._count.status || 0,
      won: statusCounts.find((s) => s.status === "WON")?._count.status || 0,
      lost: statusCounts.find((s) => s.status === "LOST")?._count.status || 0,
      onHold: statusCounts.find((s) => s.status === "ON_HOLD")?._count.status || 0,
    };

    return NextResponse.json({
      ok: true,
      data: inquiries,
      summary,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Get launchpad inquiries error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
