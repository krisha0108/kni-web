"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  MapPin,
  Users,
  Download,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

interface AnalyticsData {
  summary: {
    orders: { count: number; revenue: number };
    products: { activeCount: number };
    coverage: { type: string; locations: number } | null;
  };
  breakdowns: {
    ordersByStatus: Array<{ status: string; count: number; revenue: number }>;
    topProducts: Array<{
      product: { id: string; name: string; price: number; unit: string } | null;
      totalQuantity: number;
      totalRevenue: number;
      orderCount: number;
    }>;
    topCustomers: Array<{
      restaurant: { id: string; name: string; city: string } | null;
      orderCount: number;
      totalRevenue: number;
    }>;
  };
  trends: {
    dailyOrders: Array<{ date: Date; count: number; revenue: number }>;
  };
  recent: {
    orders: Array<{
      id: string;
      status: string;
      totalAmount: number;
      createdAt: string;
      restaurant: { name: string; city: string };
    }>;
  };
}

export default function VendorAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [period, setPeriod] = useState("30");
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/vendor/analytics?period=${period}`);
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
    try {
      setIsExporting(true);
      const response = await fetch(`/api/vendor/analytics/export?period=${period}`);

      if (!response.ok) {
        throw new Error("Failed to export PDF");
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendor-analytics-${new Date().toISOString().split("T")[0]}.pdf`;
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

  const avgOrderValue =
    analytics.summary.orders.count > 0
      ? analytics.summary.orders.revenue / analytics.summary.orders.count
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-xl sm:text-2xl lg:text-3xl font-bold">Vendor Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your marketplace performance</p>
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
              {formatPrice(analytics.summary.orders.revenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.orders.count} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground">Per order average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.products.activeCount}
            </div>
            <p className="text-xs text-muted-foreground">Listed products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analytics.summary.coverage ? (
              <>
                <div className="text-2xl font-bold">
                  {analytics.summary.coverage.locations}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.coverage.type === "CITY_WIDE" ? "Cities" : "Pincodes"}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">—</div>
                <p className="text-xs text-muted-foreground">No coverage set</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Orders by Status</CardTitle>
          <CardDescription>Distribution of order statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.breakdowns.ordersByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">{item.status}</span>
                <div className="text-right">
                  <span className="text-sm font-semibold">{formatPrice(item.revenue)}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({item.count} orders)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Products and Customers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performing products by quantity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.breakdowns.topProducts.slice(0, 5).map((item) => (
                <div
                  key={item.product?.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div>
                    <p className="text-sm font-medium">{item.product?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.totalQuantity} {item.product?.unit || "units"} sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatPrice(item.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">{item.orderCount} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
            <CardDescription>Restaurants by order value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.breakdowns.topCustomers.slice(0, 5).map((item) => (
                <div
                  key={item.restaurant?.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.restaurant?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.restaurant?.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatPrice(item.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">{item.orderCount} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest marketplace orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recent.orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="text-sm font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.restaurant.name}, {order.restaurant.city}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: <span className="font-medium">{order.status}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatPrice(order.totalAmount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
