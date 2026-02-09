"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart } from "@/components/ui/line-chart";
import { BarChart } from "@/components/ui/bar-chart";
import { PieChart } from "@/components/ui/pie-chart";
import Link from "next/link";
import {
  Package,
  Clock,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  MapPin,
  Star
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface AnalyticsData {
  summary: {
    orders: { count: number; revenue: number };
    products: { activeCount: number };
    locations: { approvedCount: number };
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
    orders: Array<any>;
  };
}

export default function VendorDashboardPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const router = useRouter();

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [analyticsRes, dashboardRes] = await Promise.all([
        fetch(`/api/vendor/analytics?period=${period}`),
        fetch("/api/vendor/dashboard"),
      ]);

      const analyticsData = await analyticsRes.json();
      const dashboardData = await dashboardRes.json();

      if (analyticsData.ok) {
        setAnalyticsData(analyticsData.data);
      }

      if (dashboardData.ok) {
        setDashboardData(dashboardData.data);
      } else if (dashboardData.redirect) {
        router.push(dashboardData.redirect);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !analyticsData || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const valueFormatter = (value: number) => `₹${value.toLocaleString("en-IN")}`;

  // Format trend data for charts
  const orderTrendData = (analyticsData.trends?.dailyOrders || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Orders: item.count,
    Revenue: item.revenue,
  }));

  // Format breakdown data
  const orderStatusData = (analyticsData.breakdowns?.ordersByStatus || []).map((item) => ({
    name: item.status.replace(/_/g, " "),
    value: item.count,
    revenue: item.revenue,
  }));

  // Top products data for bar chart
  const topProductsData = (analyticsData.breakdowns?.topProducts || [])
    .filter((item) => item.product?.name)
    .slice(0, 5)
    .map((item) => ({
      name: item.product!.name!.length > 20 ? item.product!.name!.slice(0, 17) + "..." : item.product!.name!,
      Revenue: item.totalRevenue,
      Quantity: item.totalQuantity,
      Orders: item.orderCount,
    }));

  // Top customers data for bar chart
  const topCustomersData = (analyticsData.breakdowns?.topCustomers || [])
    .filter((item) => item.restaurant?.name)
    .slice(0, 5)
    .map((item) => ({
      name: item.restaurant!.name!.length > 15 ? item.restaurant!.name!.slice(0, 12) + "..." : item.restaurant!.name!,
      Revenue: item.totalRevenue,
      Orders: item.orderCount,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Vendor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {dashboardData.userName}</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={dashboardData.subInfo.variant}>{dashboardData.subInfo.label}</Badge>
            {dashboardData.subInfo.daysLeft > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {dashboardData.subInfo.daysLeft} days remaining
              </p>
            )}
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/vendor/subscription">Manage</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.summary.products.activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Products in catalog</p>
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/vendor/products">Manage Products</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.summary.orders.count}</div>
            <p className="text-xs text-muted-foreground mt-1">In selected period</p>
            <Button size="sm" variant="outline" asChild className="mt-2">
              <Link href="/vendor/orders">View Orders</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(analyticsData.summary.orders.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">From all orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Locations Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Service Locations</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {analyticsData.summary.locations?.approvedCount || 0}
            </span>
            <span className="text-sm text-muted-foreground">Approved Areas</span>
          </div>
          <Button size="sm" variant="outline" asChild className="mt-2">
            <Link href="/vendor/locations">Manage Locations</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Trend Chart */}
      {orderTrendData.length > 0 && (
        <LineChart
          title="Order & Revenue Trends"
          description="Daily orders and revenue over time"
          data={orderTrendData}
          xKey="date"
          lines={[
            { dataKey: "Orders", name: "Orders", color: "#3b82f6" },
            { dataKey: "Revenue", name: "Revenue (₹)", color: "#10b981" },
          ]}
          height={300}
          valueFormatter={(value: number, name?: string) =>
            name === "Revenue (₹)" ? valueFormatter(value) : value.toString()
          }
        />
      )}

      {/* Performance Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {topProductsData.length > 0 && (
          <BarChart
            title="Top Selling Products"
            description="Best performing products by revenue"
            data={topProductsData}
            xKey="name"
            bars={[{ dataKey: "Revenue", name: "Revenue (₹)", color: "#10b981" }]}
            valueFormatter={valueFormatter}
            height={300}
          />
        )}

        {topCustomersData.length > 0 && (
          <BarChart
            title="Top Customers"
            description="Best customers by revenue"
            data={topCustomersData}
            xKey="name"
            bars={[{ dataKey: "Revenue", name: "Revenue (₹)", color: "#3b82f6" }]}
            valueFormatter={valueFormatter}
            height={300}
          />
        )}
      </div>

      {/* Order Status Distribution */}
      {orderStatusData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <PieChart
            title="Orders by Status"
            description="Distribution of order statuses"
            data={orderStatusData}
            nameKey="name"
            dataKey="value"
            height={300}
          />

          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
              <CardDescription>Order count and revenue by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.breakdowns.ordersByStatus.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.status.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{item.count} orders</p>
                    </div>
                    <p className="font-semibold text-sm">{formatPrice(item.revenue)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Products & Customers Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        {analyticsData.breakdowns.topProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>Best selling products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.breakdowns.topProducts.slice(0, 5).map((item, index) => (
                  <div
                    key={item.product?.id || index}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.product?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.totalQuantity} {item.product?.unit || "units"} sold
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-sm">{formatPrice(item.totalRevenue)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analyticsData.breakdowns.topCustomers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Best customers by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.breakdowns.topCustomers.slice(0, 5).map((item, index) => (
                  <div
                    key={item.restaurant?.id || index}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.restaurant?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.orderCount} orders • {item.restaurant?.city}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-sm">{formatPrice(item.totalRevenue)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Orders */}
      {analyticsData.recent.orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.recent.orders.slice(0, 5).map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-sm">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.restaurant.name} • {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatPrice(order.totalAmount)}</p>
                    <Badge variant="outline" className="text-xs">
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
