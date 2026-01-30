'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/ui/line-chart";
import { BarChart } from "@/components/ui/bar-chart";
import { PieChart } from "@/components/ui/pie-chart";
import { StatCard } from "@/components/ui/stat-card";
import { Building2, Store, Users, ClipboardList, Package, FolderOpen, DollarSign, TrendingUp, CheckCircle } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/dashboard');
      const data = await response.json();
      if (data.ok) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Overview of KNI Super App management and analytics
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
        {stats.statCards.map((stat: any) => {
          const iconMap: Record<string, any> = {
            DollarSign,
            CheckCircle,
            TrendingUp,
            Building2,
            Store,
            ClipboardList,
            FolderOpen,
            Users,
            Package
          };
          const IconComponent = iconMap[stat.icon];

          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <LineChart
          title="Revenue Trend"
          description="Revenue and bookings over the last 6 months"
          data={stats.revenueChartData}
          xKey="month"
          lines={[
            { dataKey: 'revenue', name: 'Revenue (₹)', color: '#10b981' },
            { dataKey: 'bookings', name: 'Bookings', color: '#3b82f6' }
          ]}
          valueFormatter={valueFormatter}
        />

        <PieChart
          title="Booking Status Distribution"
          description="Current status of all bookings"
          data={stats.bookingStatusData}
          dataKey="value"
          nameKey="name"
        />
      </div>

      {/* Performance Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <BarChart
          title="Top Services"
          description="Most booked services by revenue"
          data={stats.topServicesData}
          xKey="name"
          bars={[
            { dataKey: 'revenue', name: 'Revenue (₹)', color: '#10b981' }
          ]}
          valueFormatter={valueFormatter}
          height={300}
        />

        <BarChart
          title="Top Engineers"
          description="Engineers by completed jobs"
          data={stats.topEngineers}
          xKey="name"
          bars={[
            { dataKey: 'completedJobs', name: 'Completed Jobs', color: '#3b82f6' }
          ]}
          height={300}
        />
      </div>

      {/* AMC Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <PieChart
          title="AMC Subscriptions"
          description="Status distribution of AMC subscriptions"
          data={stats.amcData}
          dataKey="value"
          nameKey="name"
        />
      </div>
    </div>
  );
}
