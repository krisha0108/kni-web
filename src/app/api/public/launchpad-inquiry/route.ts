import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getNextSalesmanForAutoAssign } from "@/server/salesman/auto-assign";
import { z } from "zod";

const inquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  city: z.string().min(2, "City is required"),
  businessType: z.enum(["RESTAURANT", "CAFE", "CLOUD_KITCHEN", "QSR", "BAKERY", "CATERING", "OTHER"]),
  businessName: z.string().optional(),
  budgetRange: z.enum(["UNDER_5L", "L5_TO_10L", "L10_TO_25L", "L25_TO_50L", "L50_TO_1CR", "ABOVE_1CR"]).optional(),
  areaInSqFt: z.number().int().positive().optional(),
  timeline: z.enum(["IMMEDIATELY", "WITHIN_1_MONTH", "WITHIN_3_MONTHS", "WITHIN_6_MONTHS", "WITHIN_1_YEAR", "JUST_EXPLORING"]).optional(),
  message: z.string().optional(),
  servicesNeeded: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = inquirySchema.parse(body);

    // Rate limit: max 3 submissions per email per 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await db.launchPadInquiry.count({
      where: {
        email: validated.email,
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    if (recentCount >= 3) {
      return NextResponse.json(
        { ok: false, error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const assignedSalesmanId = await getNextSalesmanForAutoAssign();

    const inquiry = await db.launchPadInquiry.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        city: validated.city,
        businessType: validated.businessType,
        businessName: validated.businessName || null,
        budgetRange: validated.budgetRange || null,
        areaInSqFt: validated.areaInSqFt || null,
        timeline: validated.timeline || null,
        message: validated.message || null,
        servicesNeeded: validated.servicesNeeded || null,
        source: validated.source || "website",
        assignedSalesmanId,
      },
    });

    if (assignedSalesmanId) {
      const salesman = await db.user.findUnique({ where: { id: assignedSalesmanId }, select: { name: true } });
      await db.launchPadActivityLog.create({
        data: {
          inquiryId: inquiry.id,
          type: "STATUS_CHANGED",
          description: `Auto-assigned to salesman ${salesman?.name ?? "salesman"}`,
          metadata: JSON.stringify({ from: null, to: assignedSalesmanId, auto: true }),
          performedBy: "System (auto-assign)",
        },
      });
    }

    return NextResponse.json({ ok: true, data: { id: inquiry.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("LaunchPad inquiry error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
