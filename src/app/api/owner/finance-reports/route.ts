import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";

// GET /api/owner/finance-reports - Get comprehensive finance report
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

    // Build date filter
    const dateFilter = startDate && endDate
      ? {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      : undefined;

    // 1. Cashbook Summary
    const cashbookEntries = await db.cashbookEntry.findMany({
      where: {
        restaurantId,
        ...(dateFilter && { entryDate: dateFilter }),
      },
      select: {
        entryType: true,
        amount: true,
        category: true,
      },
    });

    let cashIn = 0;
    let cashOut = 0;
    let bankIn = 0;
    let bankOut = 0;
    const expensesByCategory = new Map<string, number>();

    cashbookEntries.forEach((entry) => {
      switch (entry.entryType) {
        case "CASH_IN":
          cashIn += entry.amount;
          break;
        case "CASH_OUT":
          cashOut += entry.amount;
          if (entry.category) {
            expensesByCategory.set(
              entry.category,
              (expensesByCategory.get(entry.category) || 0) + entry.amount
            );
          }
          break;
        case "BANK_IN":
          bankIn += entry.amount;
          break;
        case "BANK_OUT":
          bankOut += entry.amount;
          if (entry.category) {
            expensesByCategory.set(
              entry.category,
              (expensesByCategory.get(entry.category) || 0) + entry.amount
            );
          }
          break;
      }
    });

    const cashBalance = cashIn - cashOut;
    const bankBalance = bankIn - bankOut;

    // 2. Vendor Ledger Summary
    const vendorEntries = await db.vendorLedger.findMany({
      where: {
        restaurantId,
        ...(dateFilter && { entryDate: dateFilter }),
      },
      select: {
        vendorName: true,
        entryType: true,
        amount: true,
        balanceAfter: true,
        entryDate: true,
      },
      orderBy: {
        entryDate: "desc",
      },
    });

    // Get latest balance per vendor
    const vendorBalances = new Map<string, number>();
    const vendorPurchases = new Map<string, number>();
    const vendorPayments = new Map<string, number>();

    vendorEntries.forEach((entry) => {
      if (!vendorBalances.has(entry.vendorName) && entry.balanceAfter !== null) {
        vendorBalances.set(entry.vendorName, entry.balanceAfter);
      }

      if (entry.entryType === "PURCHASE" || entry.entryType === "DEBIT_NOTE") {
        vendorPurchases.set(
          entry.vendorName,
          (vendorPurchases.get(entry.vendorName) || 0) + entry.amount
        );
      } else if (entry.entryType === "PAYMENT" || entry.entryType === "CREDIT_NOTE") {
        vendorPayments.set(
          entry.vendorName,
          (vendorPayments.get(entry.vendorName) || 0) + entry.amount
        );
      }
    });

    const totalVendorDue = Array.from(vendorBalances.values())
      .filter((balance) => balance > 0)
      .reduce((sum, balance) => sum + balance, 0);

    // 3. Staff Salary Summary
    const salaryRecords = await db.staffSalary.findMany({
      where: {
        restaurantId,
        ...(startDate &&
          endDate && {
            OR: [
              {
                year: new Date(startDate).getFullYear(),
                month: { gte: new Date(startDate).getMonth() + 1 },
              },
              {
                year: new Date(endDate).getFullYear(),
                month: { lte: new Date(endDate).getMonth() + 1 },
              },
            ],
          }),
      },
      select: {
        totalPayable: true,
        totalPaid: true,
        status: true,
      },
    });

    const totalSalaryPayable = salaryRecords.reduce(
      (sum, record) => sum + record.totalPayable,
      0
    );
    const totalSalaryPaid = salaryRecords.reduce(
      (sum, record) => sum + record.totalPaid,
      0
    );
    const pendingSalary = totalSalaryPayable - totalSalaryPaid;

    // 4. Equipment Expenses (from bookings)
    const bookings = await db.serviceBooking.findMany({
      where: {
        restaurantId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      select: {
        totalAmount: true,
        status: true,
      },
    });

    const equipmentExpenses = bookings
      .filter((b) => b.status === "COMPLETED")
      .reduce((sum, b) => sum + b.totalAmount, 0);

    // 5. Marketplace Orders (from marketplace)
    const marketplaceOrders = await db.marketplaceOrder.findMany({
      where: {
        restaurantId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      select: {
        totalAmount: true,
        status: true,
      },
    });

    const marketplaceExpenses = marketplaceOrders
      .filter((o) => o.status === "DELIVERED")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // 6. Total expenses
    const totalExpenses =
      cashOut +
      bankOut +
      equipmentExpenses +
      marketplaceExpenses +
      totalSalaryPaid;

    // 7. Category-wise expenses
    const categoryExpenses = Array.from(expensesByCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      ok: true,
      data: {
        cashbook: {
          cashIn,
          cashOut,
          cashBalance,
          bankIn,
          bankOut,
          bankBalance,
          totalBalance: cashBalance + bankBalance,
        },
        vendors: {
          totalDue: totalVendorDue,
          totalPurchases: Array.from(vendorPurchases.values()).reduce(
            (sum, val) => sum + val,
            0
          ),
          totalPayments: Array.from(vendorPayments.values()).reduce(
            (sum, val) => sum + val,
            0
          ),
          vendorCount: vendorBalances.size,
        },
        salary: {
          totalPayable: totalSalaryPayable,
          totalPaid: totalSalaryPaid,
          pending: pendingSalary,
          recordCount: salaryRecords.length,
        },
        expenses: {
          total: totalExpenses,
          equipment: equipmentExpenses,
          marketplace: marketplaceExpenses,
          salary: totalSalaryPaid,
          other: cashOut + bankOut,
          byCategory: categoryExpenses,
        },
        summary: {
          totalIncome: cashIn + bankIn,
          totalExpenses,
          netBalance: cashIn + bankIn - totalExpenses,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to generate finance report" },
      { status: error.message?.includes("Unauthorized") ? 401 : (error.status || 500) }
    );
  }
}
