import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

// GET - Merged payment/expense feed for one owner: AMC payments, marketplace
// payments, logged expenses and cashbook entries, tagged by source and sorted
// newest-first.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const [amcPayments, marketplacePayments, expenses, cashbookEntries] = await Promise.all([
      db.aMCPayment.findMany({
        where: { ownerId: id },
        select: {
          id: true,
          paymentType: true,
          amount: true,
          status: true,
          createdAt: true,
          request: { select: { restaurant: { select: { name: true } } } },
        },
      }),
      db.marketplacePayment.findMany({
        where: { ownerId: id },
        select: {
          id: true,
          totalAmount: true,
          status: true,
          installmentType: true,
          createdAt: true,
          restaurant: { select: { name: true } },
        },
      }),
      db.expense.findMany({
        where: { ownerId: id, deletedAt: null },
        select: {
          id: true,
          category: true,
          amount: true,
          description: true,
          expenseDate: true,
          restaurant: { select: { name: true } },
        },
      }),
      db.cashbookEntry.findMany({
        where: { ownerId: id },
        select: {
          id: true,
          entryType: true,
          amount: true,
          description: true,
          entryDate: true,
          restaurant: { select: { name: true } },
        },
      }),
    ]);

    const merged = [
      ...amcPayments.map((p) => ({
        source: "amc_payment" as const,
        id: p.id,
        label: `AMC ${p.paymentType}`,
        restaurantName: p.request.restaurant.name,
        amount: p.amount,
        status: p.status,
        date: p.createdAt,
      })),
      ...marketplacePayments.map((p) => ({
        source: "marketplace_payment" as const,
        id: p.id,
        label: `Marketplace payment (${p.installmentType})`,
        restaurantName: p.restaurant.name,
        amount: p.totalAmount,
        status: p.status,
        date: p.createdAt,
      })),
      ...expenses.map((e) => ({
        source: "expense" as const,
        id: e.id,
        label: `Expense: ${e.category} — ${e.description}`,
        restaurantName: e.restaurant.name,
        amount: e.amount,
        status: null,
        date: e.expenseDate,
      })),
      ...cashbookEntries.map((c) => ({
        source: "cashbook" as const,
        id: c.id,
        label: `Cashbook ${c.entryType}: ${c.description}`,
        restaurantName: c.restaurant.name,
        amount: c.amount,
        status: null,
        date: c.entryDate,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ ok: true, data: merged });
  } catch (error) {
    console.error("Get owner payments error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
