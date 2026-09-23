import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSalesman } from "@/server/auth/rbac";

// GET — own inquiry detail, with its visits. 404s (not 403) if the inquiry
// isn't assigned to this salesman, so one salesman can't probe another's ids.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSalesman();
    const { id } = await params;

    const inquiry = await db.launchPadInquiry.findFirst({
      where: { id, assignedSalesmanId: session.id },
      include: {
        visits: { orderBy: { visitDate: "desc" } },
        activities: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ ok: false, error: "Inquiry not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: inquiry });
  } catch (error) {
    console.error("Get salesman inquiry error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

const ALLOWED_FIELDS = ["status", "priority", "followUpDate"] as const;

// PATCH — status/priority/follow-up updates, scoped to own inquiries only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSalesman();
    const { id } = await params;
    const body = await request.json();

    const currentInquiry = await db.launchPadInquiry.findFirst({
      where: { id, assignedSalesmanId: session.id },
    });

    if (!currentInquiry) {
      return NextResponse.json({ ok: false, error: "Inquiry not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = field === "followUpDate" && body[field] ? new Date(body[field]) : body[field];
      }
    }

    const inquiry = await db.launchPadInquiry.update({ where: { id }, data: updateData });

    if (body.status && body.status !== currentInquiry.status) {
      await db.launchPadActivityLog.create({
        data: {
          inquiryId: id,
          type: "STATUS_CHANGED",
          description: `Status changed from ${currentInquiry.status.replace(/_/g, " ")} to ${String(body.status).replace(/_/g, " ")}`,
          metadata: JSON.stringify({ from: currentInquiry.status, to: body.status }),
          performedBy: session.name,
        },
      });
    }

    if (body.priority && body.priority !== currentInquiry.priority) {
      await db.launchPadActivityLog.create({
        data: {
          inquiryId: id,
          type: "PRIORITY_CHANGED",
          description: `Priority changed from ${currentInquiry.priority} to ${body.priority}`,
          metadata: JSON.stringify({ from: currentInquiry.priority, to: body.priority }),
          performedBy: session.name,
        },
      });
    }

    return NextResponse.json({ ok: true, data: inquiry });
  } catch (error) {
    console.error("Update salesman inquiry error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
