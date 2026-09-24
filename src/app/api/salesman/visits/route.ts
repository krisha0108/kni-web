import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSalesman } from "@/server/auth/rbac";
import { z } from "zod";

// GET — own logged visits, optionally filtered by inquiry.
export async function GET(request: NextRequest) {
  try {
    const session = await requireSalesman();
    const searchParams = request.nextUrl.searchParams;
    const inquiryId = searchParams.get("inquiryId") || undefined;

    const visits = await db.salesmanVisit.findMany({
      where: {
        salesmanId: session.id,
        ...(inquiryId ? { inquiryId } : {}),
      },
      include: { inquiry: { select: { id: true, name: true, businessName: true } } },
      orderBy: { visitDate: "desc" },
    });

    return NextResponse.json({ ok: true, data: visits });
  } catch (error) {
    console.error("Get salesman visits error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

const createVisitSchema = z.object({
  inquiryId: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  mobileNumber: z.string().optional(),
  email: z.string().optional(),
  visitDate: z.string().min(1, "Visit date is required"),
  purpose: z.string().optional(),
  discussion: z.string().optional(),
  followUpRequired: z.boolean().optional(),
  nextFollowUpDate: z.string().optional(),
  status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]).optional(),
});

// POST — log a visit, optionally linked to one of the salesman's own inquiries.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSalesman();
    const body = await request.json();
    const parsed = createVisitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.inquiryId) {
      const inquiry = await db.launchPadInquiry.findFirst({
        where: { id: data.inquiryId, assignedSalesmanId: session.id },
      });
      if (!inquiry) {
        return NextResponse.json({ ok: false, error: "Inquiry not found" }, { status: 404 });
      }
    }

    const visit = await db.salesmanVisit.create({
      data: {
        salesmanId: session.id,
        inquiryId: data.inquiryId,
        companyId: data.companyId,
        companyName: data.companyName,
        address: data.address,
        contactPerson: data.contactPerson,
        mobileNumber: data.mobileNumber,
        email: data.email,
        visitDate: new Date(data.visitDate),
        purpose: data.purpose,
        discussion: data.discussion,
        followUpRequired: data.followUpRequired ?? false,
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
        status: data.status ?? "COMPLETED",
      },
    });

    return NextResponse.json({ ok: true, data: visit });
  } catch (error) {
    console.error("Create salesman visit error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
