import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getExpenseCategoryLabel } from "@/lib/expense";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {
      ownerId: session.id,
      deletedAt: null,
      ...(restaurantId ? { restaurantId } : {}),
    };

    // Add date range filter
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.expenseDate.lte = new Date(endDate);
      }
    }

    // Fetch expenses
    const expenses = await db.expense.findMany({
      where,
      include: {
        restaurant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { expenseDate: "desc" },
    });

    // Generate CSV
    const csvHeaders = [
      "Date",
      "Restaurant",
      "Category",
      "Description",
      "Amount (Rs)",
    ];

    const csvRows = expenses.map((expense) => {
      const date = new Date(expense.expenseDate).toLocaleDateString();
      const restaurant = expense.restaurant.name;
      const category = getExpenseCategoryLabel(expense.category as any);
      const description = expense.description.replace(/"/g, '""'); // Escape quotes
      const amount = (expense.amount / 100).toFixed(2);

      return [date, restaurant, category, `"${description}"`, amount];
    });

    // Combine headers and rows
    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    // Calculate total
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalRow = `\n\nTotal:,,,,"${(totalAmount / 100).toFixed(2)}"`;

    // Return CSV response
    return new NextResponse(csvContent + totalRow, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export expenses error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
