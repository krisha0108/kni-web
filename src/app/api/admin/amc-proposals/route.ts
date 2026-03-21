import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/admin/amc-proposals
 * Admin creates a proposal for an AMC request
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const {
      requestId,
      coveredEquipment,
      preventiveVisits,
      freeBreakdownVisits,
      responseTimeSLA,
      resolutionTimeSLA,
      exclusions,
      sparePartsPolicy,
      monthlyPrice,
      quarterlyPrice,
      annualPrice,
      contractPeriod,
    } = body;

    if (!requestId || !preventiveVisits || !monthlyPrice) {
      return NextResponse.json(
        { ok: false, error: "Request ID, preventive visits, and monthly price are required" },
        { status: 400 }
      );
    }

    const amcRequest = await db.aMCRequest.findUnique({
      where: { id: requestId },
      include: { restaurant: { select: { name: true } }, proposal: true },
    });

    if (!amcRequest) {
      return NextResponse.json({ ok: false, error: "AMC request not found" }, { status: 404 });
    }

    if (amcRequest.proposal) {
      return NextResponse.json({ ok: false, error: "Proposal already exists for this request" }, { status: 400 });
    }

    if (!["SURVEY_COMPLETED", "PROPOSAL_REJECTED"].includes(amcRequest.status)) {
      return NextResponse.json(
        { ok: false, error: `Cannot create proposal. Current status: ${amcRequest.status}` },
        { status: 400 }
      );
    }

    const proposal = await db.aMCProposal.create({
      data: {
        requestId,
        coveredEquipment: coveredEquipment || [],
        preventiveVisits,
        freeBreakdownVisits: freeBreakdownVisits || 0,
        responseTimeSLA: responseTimeSLA || null,
        resolutionTimeSLA: resolutionTimeSLA || null,
        exclusions: exclusions || [],
        sparePartsPolicy: sparePartsPolicy || null,
        monthlyPrice,
        quarterlyPrice: quarterlyPrice || null,
        annualPrice: annualPrice || null,
        contractPeriod: contractPeriod || "1 YEAR",
        status: "DRAFT",
      },
    });

    return NextResponse.json({ ok: true, data: proposal }, { status: 201 });
  } catch (error) {
    console.error("Create proposal error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/amc-proposals
 * List all proposals
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const [proposals, total] = await Promise.all([
      db.aMCProposal.findMany({
        include: {
          request: {
            include: {
              owner: { select: { id: true, name: true, phone: true } },
              restaurant: { select: { id: true, name: true, city: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      page > 0 ? db.aMCProposal.count() : Promise.resolve(-1),
    ]);

    return NextResponse.json({
      ok: true,
      data: page > 0 ? { items: proposals, total, page, pageSize } : proposals,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
