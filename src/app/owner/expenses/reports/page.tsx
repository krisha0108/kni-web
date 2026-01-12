"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { getAllExpenseCategories, getExpenseCategoryLabel, getExpenseCategoryColor } from "@/lib/expense";
import { formatPrice } from "@/lib/utils";

interface MonthlyReport {
  year: number;
  month: number;
  totalAmount: number;
  expenseCount: number;
  categoryTotals: Record<string, number>;
  comparison: {
    previousMonthTotal: number;
    changeAmount: number;
    changePercentage: number;
  };
}

export default function ExpenseReportsPage() {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchMonthlyReport();
  }, [selectedYear, selectedMonth]);

  const fetchMonthlyReport = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/owner/expenses/reports/monthly?year=${selectedYear}&month=${selectedMonth}`
      );
      const data = await response.json();
      if (data.ok) {
        setReport(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch monthly report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString("default", {
    month: "long",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const categoryData = report
    ? getAllExpenseCategories().map((cat) => ({
        category: cat.value,
        label: cat.label,
        amount: report.categoryTotals[cat.value] || 0,
        color: getExpenseCategoryColor(cat.value),
        percentage:
          report.totalAmount > 0
            ? ((report.categoryTotals[cat.value] || 0) / report.totalAmount) * 100
            : 0,
      }))
    : [];

  const topCategories = categoryData
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/owner/expenses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Expense Reports</h1>
          <p className="text-muted-foreground">Monthly expense analysis and breakdowns</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => changeMonth(-1)}>
          Previous Month
        </Button>
        <h2 className="text-2xl font-semibold">
          {monthName} {selectedYear}
        </h2>
        <Button
          variant="outline"
          onClick={() => changeMonth(1)}
          disabled={
            selectedYear === new Date().getFullYear() &&
            selectedMonth === new Date().getMonth() + 1
          }
        >
          Next Month
        </Button>
      </div>

      {!report ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No data available for this month</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatPrice(report.totalAmount)}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {report.expenseCount} expense{report.expenseCount !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Previous Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatPrice(report.comparison.previousMonthTotal)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(selectedYear, selectedMonth - 2).toLocaleString("default", {
                    month: "long",
                  })}{" "}
                  {selectedMonth === 1 ? selectedYear - 1 : selectedYear}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Change</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {report.comparison.changeAmount >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  )}
                  <div
                    className={`text-3xl font-bold ${
                      report.comparison.changeAmount >= 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {report.comparison.changePercentage >= 0 ? "+" : ""}
                    {report.comparison.changePercentage.toFixed(1)}%
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatPrice(Math.abs(report.comparison.changeAmount))}
                  {report.comparison.changeAmount >= 0 ? " increase" : " decrease"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Expense Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No expenses recorded this month
                </p>
              ) : (
                topCategories.map((category) => (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(category.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${category.percentage}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {categoryData
                  .filter((c) => c.amount > 0)
                  .map((category) => (
                    <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm font-medium">{category.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatPrice(category.amount)}</p>
                        <Badge variant="outline" className="text-xs">
                          {category.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
              {categoryData.filter((c) => c.amount > 0).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No expenses recorded this month
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
