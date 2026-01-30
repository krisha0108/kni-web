import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { z } from "zod";

const createEntrySchema = z.object({
  restaurantId: z.string(),
  vendorName: z.string().min(1, "Vendor name is required"),
  vendorPhone: z.string().optional(),
  vendorGST: z.string().optional(),
  entryType: z.enum(["PURCHASE", "PAYMENT", "CREDIT_NOTE", "DEBIT_NOTE"]),
  amount: z.number().positive("Amount must be positive"),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD", "OTHER"]).optional(),
  description: z.string().min(1, "Description is required"),
  billNumber: z.string().optional(),
  billDate: z.string().optional(),
  dueDate: z.string().optional(),
  entryDate: z.string(),
});

// GET /api/owner/vendor-ledger - List vendor ledger entries
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const vendorName = request.nextUrl.searchParams.get("vendorName");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    const where: any = {
      restaurantId,
      ownerId: session.id,
    };

    if (vendorName) {
      where.vendorName = {
        contains: vendorName,
      };
    }

    if (startDate && endDate) {
      where.entryDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const entries = await db.vendorLedger.findMany({
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
      { ok: false, error: error.message || "Failed to fetch vendor ledger" },
      { status: error.status || 500 }
    );
  }
}

// POST /api/owner/vendor-ledger - Create vendor ledger entry
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
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

    // Amount is stored in rupees directly
    const amount = validated.amount;

    // Calculate running balance for this vendor
    const previousEntries = await db.vendorLedger.findMany({
      where: {
        restaurantId: validated.restaurantId,
        ownerId: session.id,
        vendorName: validated.vendorName,
      },
      orderBy: {
        entryDate: "desc",
      },
      take: 1,
    });

    const previousBalance = previousEntries[0]?.balanceAfter || 0;

    // Calculate new balance
    // PURCHASE and DEBIT_NOTE increase balance (money owed to vendor)
    // PAYMENT and CREDIT_NOTE decrease balance
    let balanceChange = 0;
    if (validated.entryType === "PURCHASE" || validated.entryType === "DEBIT_NOTE") {
      balanceChange = amount;
    } else if (validated.entryType === "PAYMENT" || validated.entryType === "CREDIT_NOTE") {
      balanceChange = -amount;
    }

    const newBalance = previousBalance + balanceChange;

    const entry = await db.vendorLedger.create({
      data: {
        ownerId: session.id,
        restaurantId: validated.restaurantId,
        vendorName: validated.vendorName,
        vendorPhone: validated.vendorPhone,
        vendorGST: validated.vendorGST,
        entryType: validated.entryType,
        amount: amount,
        paymentMode: validated.paymentMode,
        description: validated.description,
        billNumber: validated.billNumber,
        billDate: validated.billDate ? new Date(validated.billDate) : null,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        balanceAfter: newBalance,
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
      { ok: false, error: error.message || "Failed to create vendor ledger entry" },
      { status: error.status || 500 }
    );
  }
}
