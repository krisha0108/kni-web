import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { z } from "zod";

const createEntrySchema = z.object({
  restaurantId: z.string(),
  entryType: z.enum(["CASH_IN", "CASH_OUT", "BANK_IN", "BANK_OUT"]),
  amount: z.number().positive("Amount must be positive"),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD", "OTHER"]).default("CASH"),
  category: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  referenceNo: z.string().optional(),
  entryDate: z.string(), // ISO date string
});

// GET /api/owner/cashbook - List cashbook entries
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");
    const entryType = request.nextUrl.searchParams.get("entryType");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {
      restaurantId,
      ownerId: session.id,
    };

    if (startDate && endDate) {
      where.entryDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (entryType) {
      where.entryType = entryType;
    }

    const entries = await db.cashbookEntry.findMany({
      where,
      orderBy: [
        { entryDate: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      ok: true,
      data: entries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch cashbook entries" },
      { status: error.status || 500 }
    );
  }
}

// POST /api/owner/cashbook - Create cashbook entry
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();
    const body = await request.json();
    const validated = createEntrySchema.parse(body);

    // Verify restaurant ownership
    const restaurant = await db.restaurant.findFirst({
      where: {
        id: validated.restaurantId,
        ownerId: session.id,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or access denied" },
        { status: 404 }
      );
    }

    // Convert amount to paise
    const amountInPaise = Math.round(validated.amount * 100);

    const entry = await db.cashbookEntry.create({
      data: {
        ownerId: session.id,
        restaurantId: validated.restaurantId,
        entryType: validated.entryType,
        amount: amountInPaise,
        paymentMode: validated.paymentMode,
        category: validated.category,
        description: validated.description,
        referenceNo: validated.referenceNo,
        entryDate: new Date(validated.entryDate),
        createdBy: session.id,
      },
    });

    return NextResponse.json({
      ok: true,
      data: entry,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create cashbook entry" },
      { status: error.status || 500 }
    );
  }
}
