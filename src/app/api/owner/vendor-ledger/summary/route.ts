import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";

// GET /api/owner/vendor-ledger/summary - Get vendor-wise summary
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with vendor-ledger:read permission
    await requireRestaurantAccess(session, restaurantId, "vendor-ledger:read");

    // Get all vendors with their latest balance
    const entries = await db.vendorLedger.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        entryDate: "desc",
      },
    });

    // Group by vendor and get latest balance
    const vendorMap = new Map<string, {
      vendorName: string;
      vendorPhone: string | null;
      vendorGST: string | null;
      balance: number;
      totalPurchases: number;
      totalPayments: number;
      lastTransactionDate: Date;
      entryCount: number;
    }>();

    entries.forEach((entry) => {
      const existing = vendorMap.get(entry.vendorName);

      if (!existing) {
        vendorMap.set(entry.vendorName, {
          vendorName: entry.vendorName,
          vendorPhone: entry.vendorPhone,
          vendorGST: entry.vendorGST,
          balance: entry.balanceAfter || 0,
          totalPurchases: entry.entryType === "PURCHASE" || entry.entryType === "DEBIT_NOTE" ? entry.amount : 0,
          totalPayments: entry.entryType === "PAYMENT" || entry.entryType === "CREDIT_NOTE" ? entry.amount : 0,
          lastTransactionDate: entry.entryDate,
          entryCount: 1,
        });
      } else {
        // Update totals
        if (entry.entryType === "PURCHASE" || entry.entryType === "DEBIT_NOTE") {
          existing.totalPurchases += entry.amount;
        } else if (entry.entryType === "PAYMENT" || entry.entryType === "CREDIT_NOTE") {
          existing.totalPayments += entry.amount;
        }
        existing.entryCount += 1;
      }
    });

    const vendors = Array.from(vendorMap.values()).sort((a, b) =>
      b.balance - a.balance // Sort by balance descending (highest dues first)
    );

    const totalDue = vendors.reduce((sum, v) => sum + (v.balance > 0 ? v.balance : 0), 0);
    const totalAdvance = vendors.reduce((sum, v) => sum + (v.balance < 0 ? Math.abs(v.balance) : 0), 0);

    return NextResponse.json({
      ok: true,
      data: {
        vendors,
        summary: {
          totalVendors: vendors.length,
          totalDue,
          totalAdvance,
          netBalance: totalDue - totalAdvance,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch vendor summary" },
      { status: error.status || 500 }
    );
  }
}
