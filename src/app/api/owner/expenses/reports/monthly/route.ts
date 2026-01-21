import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { groupExpensesByCategory } from "@/lib/expense";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString(), 10);
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString(), 10);

    // Validate month
    if (month < 1 || month > 12) {
      return NextResponse.json(
        { ok: false, error: "Invalid month. Must be between 1 and 12." },
        { status: 400 }
      );
    }

    // Get start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const where: any = {
      ownerId: session.id,
      deletedAt: null,
      expenseDate: {
        gte: startDate,
        lte: endDate,
      },
      ...(restaurantId ? { restaurantId } : {}),
    };

    // Fetch all expenses for the month
    const expenses = await db.expense.findMany({
      where,
      select: {
        id: true,
        category: true,
        amount: true,
        expenseDate: true,
        description: true,
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { expenseDate: "desc" },
    });

    // Calculate totals by category
    const categoryTotals = groupExpensesByCategory(
      expenses.map((e) => ({ amount: e.amount, category: e.category as any }))
    );

    // Calculate overall total
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Get previous month for comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

    const prevExpenses = await db.expense.findMany({
      where: {
        ownerId: session.id,
        deletedAt: null,
        expenseDate: {
          gte: prevStartDate,
          lte: prevEndDate,
        },
        ...(restaurantId ? { restaurantId } : {}),
      },
      select: {
        amount: true,
      },
    });

    const prevMonthTotal = prevExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const changePercentage =
      prevMonthTotal > 0 ? ((totalAmount - prevMonthTotal) / prevMonthTotal) * 100 : 0;

    return NextResponse.json({
      ok: true,
      data: {
        year,
        month,
        totalAmount,
        expenseCount: expenses.length,
        categoryTotals,
        expenses,
        comparison: {
          previousMonthTotal: prevMonthTotal,
          changeAmount: totalAmount - prevMonthTotal,
          changePercentage,
        },
      },
    });
  } catch (error) {
    console.error("Get monthly report error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
