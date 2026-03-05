"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart } from "@/components/ui/line-chart";
import { BarChart } from "@/components/ui/bar-chart";
import { PieChart } from "@/components/ui/pie-chart";
import Link from "next/link";
import {
  Building2,
  ShoppingCart,
  Calendar,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wrench,
  FileText,
  AlertCircle
} from "lucide-react";
import { useRestaurant } from "@/contexts/restaurant-context";
import { formatPrice } from "@/lib/utils";

interface AnalyticsData {
  summary: {
    bookings: { count: number; revenue: number };
    expenses: { count: number; total: number };
    equipment: { count: number };
    marketplaceOrders: { count: number; total: number };
    netRevenue: number;
  };
  breakdowns: {
    bookingsByStatus: Array<{ status: string; count: number }>;
    expensesByCategory: Array<{ category: string; count: number; total: number }>;
    marketplaceOrdersByStatus: Array<{ status: string; count: number }>;
  };
  trends: {
    dailyBookings: Array<{ date: Date; count: number; revenue: number }>;
    dailyExpenses: Array<{ date: Date; count: number; total: number }>;
  };
  recent: {
    bookings: Array<any>;
    expenses: Array<any>;
  };
}

export default function OwnerDashboardPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const { selectedRestaurant } = useRestaurant();

  useEffect(() => {
    if (selectedRestaurant) {
      fetchAnalytics();
    }
  }, [selectedRestaurant, period]);

  const fetchAnalytics = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/owner/analytics?restaurantId=${selectedRestaurant.restaurantId}&period=${period}`
      );
      const data = await response.json();
      if (data.ok) {
        setAnalyticsData(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedRestaurant) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Please select a restaurant</p>
          <p className="text-sm text-muted-foreground mt-2">
            Use the restaurant switcher in the header to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const valueFormatter = (value: number) => `₹${value.toLocaleString("en-IN")}`;

  // Format trend data for charts
  const bookingTrendData = (analyticsData.trends?.dailyBookings || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Bookings: item.count,
    Revenue: item.revenue,
  }));

  const expenseTrendData = (analyticsData.trends?.dailyExpenses || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Expenses: item.count,
    Amount: item.total,
  }));

  // Format breakdown data for pie charts
  const bookingStatusData = (analyticsData.breakdowns?.bookingsByStatus || []).map((item) => ({
    name: item.status.replace(/_/g, " "),
    value: item.count,
  }));

  const expenseCategoryData = (analyticsData.breakdowns?.expensesByCategory || []).map((item) => ({
    name: item.category.replace(/_/g, " "),
    value: item.total,
  }));

  const netRevenue = analyticsData.summary.netRevenue;
  const isProfit = netRevenue >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Analytics for {selectedRestaurant.restaurant.name}
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold leading-tight">{analyticsData.summary.bookings.count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue: {formatPrice(analyticsData.summary.bookings.revenue)}
            </p>
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/owner/bookings">View All</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold leading-tight">{analyticsData.summary.expenses.count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatPrice(analyticsData.summary.expenses.total)}
            </p>
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/owner/expenses">View All</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipment</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold leading-tight">{analyticsData.summary.equipment.count}</div>
            <p className="text-xs text-muted-foreground mt-1">Total items tracked</p>
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/owner/equipment">Manage</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            {isProfit ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-lg sm:text-2xl font-bold leading-tight break-all ${isProfit ? "text-green-600" : "text-red-600"}`}>
              {formatPrice(Math.abs(netRevenue))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isProfit ? "Profit" : "Loss"} (Bookings - Expenses)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marketplace Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold leading-tight">{analyticsData.summary.marketplaceOrders.count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatPrice(analyticsData.summary.marketplaceOrders.total)}
            </p>
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/owner/marketplace/orders">View All</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Trend Charts */}
      {bookingTrendData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <LineChart
            title="Booking Trends"
            description="Daily bookings and revenue over time"
            data={bookingTrendData}
            xKey="date"
            lines={[
              { dataKey: "Bookings", name: "Bookings", color: "#3b82f6" },
              { dataKey: "Revenue", name: "Revenue (₹)", color: "#10b981" },
            ]}
            height={300}
            valueFormatter={(value: number, name?: string) =>
              name === "Revenue (₹)" ? valueFormatter(value) : value.toString()
            }
          />

          <LineChart
            title="Expense Trends"
            description="Daily expenses over time"
            data={expenseTrendData}
            xKey="date"
            lines={[
              { dataKey: "Expenses", name: "Expense Count", color: "#f59e0b" },
              { dataKey: "Amount", name: "Amount (₹)", color: "#ef4444" },
            ]}
            height={300}
            valueFormatter={(value: number, name?: string) =>
              name === "Amount (₹)" ? valueFormatter(value) : value.toString()
            }
          />
        </div>
      )}

      {/* Breakdown Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {bookingStatusData.length > 0 && (
          <PieChart
            title="Bookings by Status"
            description="Distribution of booking statuses"
            data={bookingStatusData}
            nameKey="name"
            dataKey="value"
            height={300}
          />
        )}

        {expenseCategoryData.length > 0 && (
          <PieChart
            title="Expenses by Category"
            description="Distribution of expenses by category"
            data={expenseCategoryData}
            nameKey="name"
            dataKey="value"
            height={300}
            valueFormatter={valueFormatter}
          />
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {(analyticsData.recent?.bookings?.length || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest service bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(analyticsData.recent?.bookings || []).map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-sm">#{booking.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatPrice(booking.totalAmount)}</p>
                      <Badge variant="outline" className="text-xs">
                        {booking.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {(analyticsData.recent?.expenses?.length || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Latest recorded expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(analyticsData.recent?.expenses || []).map((expense: any) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{expense.category.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </p>
                      {expense.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {expense.description}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-sm">{formatPrice(expense.amount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}