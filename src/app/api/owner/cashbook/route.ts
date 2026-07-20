import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
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
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");
    const entryType = request.nextUrl.searchParams.get("entryType");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "0");
    const pageSize = parseInt(request.nextUrl.searchParams.get("pageSize") || "20");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    await requireRestaurantAccess(session, restaurantId, "expenses:read");

    // Build where clause
    const where: any = {
      restaurantId,
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

    const [entries, total] = await Promise.all([
      db.cashbookEntry.findMany({
        where,
        orderBy: [
          { entryDate: "desc" },
          { createdAt: "desc" },
        ],
        ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      db.cashbookEntry.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: page > 0 ? { items: entries, total } : entries,
      total,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch cashbook entries" },
      { status: error.message?.includes("Unauthorized") ? 401 : (error.status || 500) }
    );
  }
}

// POST /api/owner/cashbook - Create cashbook entry
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();
    const validated = createEntrySchema.parse(body);

    // Verify RBAC access
    await requireRestaurantAccess(session, validated.restaurantId, "expenses:create");

    // Verify restaurant exists
    const restaurant = await db.restaurant.findFirst({
      where: {
        id: validated.restaurantId,
        status: "APPROVED",
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 404 }
      );
    }

    // Use actual restaurant owner ID for FK
    const ownerId = await getRestaurantOwnerId(validated.restaurantId);

    const entry = await db.cashbookEntry.create({
      data: {
        ownerId,
        restaurantId: validated.restaurantId,
        entryType: validated.entryType,
        amount: validated.amount,
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
        { ok: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create cashbook entry" },
      { status: error.message?.includes("Unauthorized") ? 401 : (error.status || 500) }
    );
  }
}
