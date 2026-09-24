import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

// GET a salesman's merged, filterable activity history: their logged visits
// plus their inquiry activity log entries (LaunchPadActivityLog.performedBy
// is matched by name, the same denormalized convention the existing admin
// Launchpad activity log already uses for admins).
//
// Query params (all optional):
//   range = today | week | month | custom
//   from / to = ISO dates, used when range=custom (or as extra bounds otherwise)
//   inquiryId = filter to one inquiry
//   type = visit | activity (filter to just one kind of entry)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const salesman = await db.user.findUnique({
      where: { id, role: "SALESMAN" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        salesmanProfile: { select: { region: true } },
      },
    });

    if (!salesman) {
      return NextResponse.json({ ok: false, error: "Salesman not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get("range"); // today | week | month | custom
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const inquiryId = searchParams.get("inquiryId") || undefined;
    const typeFilter = searchParams.get("type"); // visit | activity

    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;
    const now = new Date();
    if (range === "today") {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateTo = new Date(dateFrom);
      dateTo.setDate(dateTo.getDate() + 1);
    } else if (range === "week") {
      dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 7);
    } else if (range === "month") {
      dateFrom = new Date(now);
      dateFrom.setMonth(dateFrom.getMonth() - 1);
    } else if (range === "custom") {
      if (fromParam) dateFrom = new Date(fromParam);
      if (toParam) dateTo = new Date(toParam);
    }

    const [visits, inquiries, activities, pendingFollowUps] = await Promise.all([
      typeFilter === "activity"
        ? Promise.resolve([])
        : db.salesmanVisit.findMany({
            where: {
              salesmanId: id,
              ...(inquiryId ? { inquiryId } : {}),
              ...(dateFrom || dateTo
                ? { visitDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lt: dateTo } : {}) } }
                : {}),
            },
            orderBy: { visitDate: "desc" },
          }),
      db.launchPadInquiry.findMany({
        where: { assignedSalesmanId: id },
        select: { id: true, name: true, businessName: true, status: true },
      }),
      typeFilter === "visit"
        ? Promise.resolve([])
        : db.launchPadActivityLog.findMany({
            where: {
              performedBy: salesman.name,
              // Name match alone isn't enough — a customer and a later-added
              // salesman can share a name (real collision hit 2026-09-24: a
              // customer "Krisha Ghadiya" from an old inquiry leaked into a
              // new salesman of the same name's activity feed). Requiring
              // the inquiry to be currently assigned to this salesman scopes
              // it correctly.
              inquiry: { assignedSalesmanId: id },
              ...(inquiryId ? { inquiryId } : {}),
              ...(dateFrom || dateTo
                ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lt: dateTo } : {}) } }
                : {}),
            },
            include: { inquiry: { select: { id: true, name: true, businessName: true } } },
            orderBy: { createdAt: "desc" },
          }),
      db.salesmanVisit.count({
        where: { salesmanId: id, followUpRequired: true, nextFollowUpDate: { gte: new Date() } },
      }),
    ]);

    const timeline = [
      ...visits.map((v) => ({
        kind: "visit" as const,
        id: v.id,
        date: v.visitDate,
        title: `Visited ${v.companyName}`,
        description: v.discussion || v.purpose || null,
        status: v.status,
        inquiryId: v.inquiryId,
        followUpRequired: v.followUpRequired,
        nextFollowUpDate: v.nextFollowUpDate,
      })),
      ...activities.map((a) => ({
        kind: "activity" as const,
        id: a.id,
        date: a.createdAt,
        title: a.type.replace(/_/g, " "),
        description: a.description,
        status: null,
        inquiryId: a.inquiryId,
        inquiryName: a.inquiry?.businessName || a.inquiry?.name,
        followUpRequired: false,
        nextFollowUpDate: null,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      ok: true,
      data: {
        salesman,
        stats: {
          totalInquiries: inquiries.length,
          totalVisits: await db.salesmanVisit.count({ where: { salesmanId: id } }),
          pendingFollowUps,
        },
        inquiries,
        timeline,
      },
    });
  } catch (error) {
    console.error("Get salesman activity error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
