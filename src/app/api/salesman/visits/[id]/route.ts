import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSalesman } from "@/server/auth/rbac";

// GET — a single visit of the salesman's own.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSalesman();
    const { id } = await params;

    const visit = await db.salesmanVisit.findFirst({
      where: { id, salesmanId: session.id },
      include: { inquiry: { select: { id: true, name: true, businessName: true } } },
    });

    if (!visit) {
      return NextResponse.json({ ok: false, error: "Visit not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: visit });
  } catch (error) {
    console.error("Get salesman visit error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

const ALLOWED_FIELDS = [
  "companyName", "address", "contactPerson", "mobileNumber", "email",
  "purpose", "discussion", "followUpRequired", "status",
] as const;

// PATCH — update a visit of the salesman's own.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSalesman();
    const { id } = await params;
    const body = await request.json();

    const current = await db.salesmanVisit.findFirst({ where: { id, salesmanId: session.id } });
    if (!current) {
      return NextResponse.json({ ok: false, error: "Visit not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (body.visitDate !== undefined) updateData.visitDate = new Date(body.visitDate);
    if (body.nextFollowUpDate !== undefined) {
      updateData.nextFollowUpDate = body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : null;
    }

    const visit = await db.salesmanVisit.update({ where: { id }, data: updateData });

    return NextResponse.json({ ok: true, data: visit });
  } catch (error) {
    console.error("Update salesman visit error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
