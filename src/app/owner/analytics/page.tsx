"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/contexts/restaurant-context";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Wrench,
  Building2,
  Calendar,
  Download,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

interface AnalyticsData {
  summary: {
    bookings: { count: number; revenue: number };
    expenses: { count: number; total: number };
    equipment: { count: number };
    amcSubscriptions: { count: number; value: number };
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
    bookings: Array<{
      id: string;
      status: string;
      totalAmount: number;
      createdAt: string;
      slotStartDateTime: string | null;
    }>;
    expenses: Array<{
      id: string;
      amount: number;
      category: string;
      date: string;
      description: string | null;
    }>;
  };
}

export default function OwnerAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [period, setPeriod] = useState("30");
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

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
        setAnalytics(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch analytics",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch analytics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsExporting(true);
      const response = await fetch(
        `/api/owner/analytics/export?restaurantId=${selectedRestaurant.restaurantId}&period=${period}`
      );

      if (!response.ok) {
        throw new Error("Failed to export PDF");
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${selectedRestaurant.restaurant.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Analytics report exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const profitMargin =
    analytics.summary.bookings.revenue > 0
      ? ((analytics.summary.netRevenue / analytics.summary.bookings.revenue) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-xl sm:text-2xl lg:text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Overview of {selectedRestaurant.restaurant.name}
          </p>
        </div>
        <ClientOnly>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportPDF} disabled={isExporting || !analytics} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </ClientOnly>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(analytics.summary.bookings.revenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.bookings.count} bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPrice(analytics.summary.expenses.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.expenses.count} expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                analytics.summary.netRevenue >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatPrice(analytics.summary.netRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {profitMargin}% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marketplace Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(analytics.summary.marketplaceOrders.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.marketplaceOrders.count} orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipment</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.equipment.count}</div>
            <p className="text-xs text-muted-foreground">Active equipment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AMC Subscriptions</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.amcSubscriptions.count}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPrice(analytics.summary.amcSubscriptions.value)} total value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Status</CardTitle>
            <CardDescription>Distribution of booking statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.breakdowns.bookingsByStatus.map((item) => (
                <div key={item.status} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span className="text-sm font-medium">{item.status}</span>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Breakdown of expense categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.breakdowns.expensesByCategory.map((item) => (
                <div key={item.category} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span className="text-sm font-medium">{item.category}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatPrice(item.total)} ({item.count})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Latest service bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recent.bookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-sm font-medium">#{booking.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{booking.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatPrice(booking.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(booking.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Latest expense entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recent.expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-sm font-medium">{expense.category}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {expense.description || "No description"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      {formatPrice(expense.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(expense.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
