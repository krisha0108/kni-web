import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";

// GET /api/owner/cashbook/stats - Get cashbook statistics
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

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

    // Get all entries
    const entries = await db.cashbookEntry.findMany({
      where,
      select: {
        entryType: true,
        amount: true,
        paymentMode: true,
      },
    });

    // Calculate totals
    let cashIn = 0;
    let cashOut = 0;
    let bankIn = 0;
    let bankOut = 0;

    entries.forEach((entry) => {
      switch (entry.entryType) {
        case "CASH_IN":
          cashIn += entry.amount;
          break;
        case "CASH_OUT":
          cashOut += entry.amount;
          break;
        case "BANK_IN":
          bankIn += entry.amount;
          break;
        case "BANK_OUT":
          bankOut += entry.amount;
          break;
      }
    });

    const cashBalance = cashIn - cashOut;
    const bankBalance = bankIn - bankOut;
    const totalBalance = cashBalance + bankBalance;

    return NextResponse.json({
      ok: true,
      data: {
        cashIn,
        cashOut,
        cashBalance,
        bankIn,
        bankOut,
        bankBalance,
        totalBalance,
        totalEntries: entries.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch cashbook stats" },
      { status: error.status || 500 }
    );
  }
}
