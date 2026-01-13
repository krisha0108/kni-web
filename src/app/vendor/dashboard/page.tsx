'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/ui/bar-chart";
import { PieChart } from "@/components/ui/pie-chart";
import Link from "next/link";
import { Package, Clock, ShoppingCart, CheckCircle, DollarSign, TrendingUp } from "lucide-react";

export default function VendorDashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/vendor/dashboard');
      const data = await response.json();
      if (data.ok) {
        setDashboardData(data.data);
      } else if (data.redirect) {
        router.push(data.redirect);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const valueFormatter = (value: any) => typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {dashboardData.userName}
        </p>
      </div>

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
            <div className="text-2xl font-bold">{dashboardData.products}</div>
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
            <div className="text-2xl font-bold">{dashboardData.orders}</div>
            <p className="text-xs text-muted-foreground">
              From restaurant owners
            </p>
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
            <div className="text-2xl font-bold">₹{dashboardData.totalRevenue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">
              From all orders
            </p>
          </CardContent>
        </Card>
      </div>

      {dashboardData.topProductsData && dashboardData.topProductsData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <BarChart
            title="Top Selling Products"
            description="Products by revenue"
            data={dashboardData.topProductsData}
            xKey="name"
            bars={[
              { dataKey: 'revenue', name: 'Revenue (₹)', color: '#10b981' }
            ]}
            valueFormatter={valueFormatter}
            height={300}
          />
          <BarChart
            title="Product Sales Volume"
            description="Products by quantity sold"
            data={dashboardData.topProductsData}
            xKey="name"
            bars={[
              { dataKey: 'quantity', name: 'Quantity Sold', color: '#3b82f6' }
            ]}
            height={300}
          />
        </div>
      )}
    </div>
  );
}
