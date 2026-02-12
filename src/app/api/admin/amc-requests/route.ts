import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/amc-requests
 * List all AMC requests for admin with filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { restaurant: { name: { contains: search } } },
        { owner: { name: { contains: search } } },
        { kitchenType: { contains: search } },
      ];
    }

    const requests = await db.aMCRequest.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        restaurant: { select: { id: true, name: true, city: true, address: true } },
        survey: {
          include: { engineer: { select: { name: true, phone: true } } },
        },
        proposal: {
          include: { contract: { select: { id: true, contractNumber: true, status: true } } },
        },
        payment: {
          select: { id: true, paymentType: true, amount: true, screenshotUrl: true, status: true, rejectionReason: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: requests });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
