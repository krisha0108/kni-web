import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSalesman } from "@/server/auth/rbac";
import { InquiryStatus } from "@prisma/client";
import { z } from "zod";

// GET — the salesman's own assigned inquiries (website leads assigned to
// them by Admin, plus inquiries they self-entered).
export async function GET(request: NextRequest) {
  try {
    const session = await requireSalesman();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as InquiryStatus | null;

    const inquiries = await db.launchPadInquiry.findMany({
      where: {
        assignedSalesmanId: session.id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: inquiries });
  } catch (error) {
    console.error("Get salesman inquiries error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

const createInquirySchema = z.object({
  name: z.string().min(1, "Customer/company contact name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  city: z.string().min(1, "City is required"),
  address: z.string().optional(),
  businessName: z.string().optional(),
  businessType: z.enum(["RESTAURANT", "CAFE", "CLOUD_KITCHEN", "QSR", "BAKERY", "CATERING", "OTHER"]),
  budgetRange: z.enum(["UNDER_5L", "L5_TO_10L", "L10_TO_25L", "L25_TO_50L", "L50_TO_1CR", "ABOVE_1CR"]).optional(),
  areaInSqFt: z.number().int().positive().optional(),
  timeline: z.enum(["IMMEDIATELY", "WITHIN_1_MONTH", "WITHIN_3_MONTHS", "WITHIN_6_MONTHS", "WITHIN_1_YEAR", "JUST_EXPLORING"]).optional(),
  message: z.string().optional(),
  servicesNeeded: z.string().optional(),
  source: z.enum(["WhatsApp", "Phone", "Reference", "Other"]),
});

// POST — salesman self-entering a new inquiry they picked up via
// call/WhatsApp/reference. Assigned to themselves, source recorded, and
// an INQUIRY_CREATED activity logged for the audit trail.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSalesman();
    const body = await request.json();
    const parsed = createInquirySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const inquiry = await db.launchPadInquiry.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        city: data.city,
        address: data.address,
        businessName: data.businessName,
        businessType: data.businessType,
        budgetRange: data.budgetRange,
        areaInSqFt: data.areaInSqFt,
        timeline: data.timeline,
        message: data.message,
        servicesNeeded: data.servicesNeeded,
        source: data.source,
        assignedSalesmanId: session.id,
        assignedTo: session.name,
      },
    });

    await db.launchPadActivityLog.create({
      data: {
        inquiryId: inquiry.id,
        type: "INQUIRY_CREATED",
        description: `Inquiry self-entered by ${session.name} via ${data.source}`,
        metadata: JSON.stringify({ source: data.source }),
        performedBy: session.name,
      },
    });

    return NextResponse.json({ ok: true, data: inquiry });
  } catch (error) {
    console.error("Create salesman inquiry error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
