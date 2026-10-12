import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSalesman } from "@/server/auth/rbac";
import { z } from "zod";

// GET — the salesman's own follow-ups (on inquiries and/or companies),
// soonest first. The Follow-ups page splits these into Upcoming/Overdue
// client-side by comparing followUpDate to now.
export async function GET() {
  try {
    const session = await requireSalesman();

    const followUps = await db.salesmanFollowUp.findMany({
      where: { salesmanId: session.id },
      include: {
        inquiry: { select: { id: true, name: true, businessName: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { followUpDate: "asc" },
    });

    return NextResponse.json({ ok: true, data: followUps });
  } catch (error) {
    console.error("Get salesman follow-ups error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

const createFollowUpSchema = z
  .object({
    inquiryId: z.string().optional(),
    companyId: z.string().optional(),
    followUpDate: z.string().min(1, "Follow-up date is required"),
    note: z.string().min(1, "Note is required"),
  })
  .refine((data) => !!data.inquiryId !== !!data.companyId, {
    message: "Exactly one of inquiryId or companyId is required",
  });

// POST — set a follow-up reminder on an inquiry or a company.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSalesman();
    const body = await request.json();
    const parsed = createFollowUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { inquiryId, companyId, followUpDate, note } = parsed.data;

    const followUp = await db.salesmanFollowUp.create({
      data: {
        salesmanId: session.id,
        inquiryId,
        companyId,
        followUpDate: new Date(followUpDate),
        note,
      },
      include: {
        inquiry: { select: { id: true, name: true, businessName: true } },
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, data: followUp });
  } catch (error) {
    console.error("Create salesman follow-up error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
