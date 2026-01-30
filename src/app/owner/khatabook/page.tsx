"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/contexts/restaurant-context";
import { formatPrice } from "@/lib/utils";
import {
  Wallet,
  Users,
  Store,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Receipt,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface FinanceStats {
  cashbook: {
    cashBalance: number;
    bankBalance: number;
    totalBalance: number;
    cashIn: number;
    cashOut: number;
    bankIn: number;
    bankOut: number;
  };
  vendors: {
    totalDue: number;
    vendorCount: number;
  };
  salary: {
    totalPayable: number;
    totalPaid: number;
    pending: number;
  };
  expenses: {
    total: number;
    equipment: number;
    marketplace: number;
    salary: number;
  };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  };
}

export default function KhatabookDashboardPage() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (selectedRestaurant) {
      fetchStats();
    }
  }, [selectedRestaurant]);

  const fetchStats = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/owner/finance-reports?restaurantId=${selectedRestaurant.restaurantId}`
      );
      const data = await response.json();

      if (data.ok) {
        setStats(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch finance stats",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch finance stats",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedRestaurant) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please select a restaurant</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading finance dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Khatabook</h1>
        <p className="text-muted-foreground">
          Complete finance management for {selectedRestaurant.restaurant.name}
        </p>
      </div>

      {/* Summary Cards */}
      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(stats.cashbook.totalBalance)}
                </div>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <span>Cash: {formatPrice(stats.cashbook.cashBalance)}</span>
                  <span>•</span>
                  <span>Bank: {formatPrice(stats.cashbook.bankBalance)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Vendor Dues</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatPrice(stats.vendors.totalDue)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.vendors.vendorCount} vendors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Salary</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatPrice(stats.salary.pending)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Paid: {formatPrice(stats.salary.totalPaid)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    stats.summary.netBalance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPrice(stats.summary.netBalance)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Income - Expenses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Income & Expenses Overview */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                  Income
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">
                  {formatPrice(stats.summary.totalIncome)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Received</span>
                    <span className="font-medium">{formatPrice(stats.cashbook.cashIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank Received</span>
                    <span className="font-medium">{formatPrice(stats.cashbook.bankIn)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                  Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600">
                  {formatPrice(stats.summary.totalExpenses)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Equipment Services</span>
                    <span className="font-medium">{formatPrice(stats.expenses.equipment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marketplace Orders</span>
                    <span className="font-medium">{formatPrice(stats.expenses.marketplace)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Staff Salary</span>
                    <span className="font-medium">{formatPrice(stats.expenses.salary)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Finance Modules</CardTitle>
          <CardDescription>Manage your restaurant finances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto py-6 flex-col items-start"
              onClick={() => router.push("/owner/khatabook/cashbook")}
            >
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5" />
                <span className="font-semibold">Daily Cashbook</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Track cash and bank transactions
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex-col items-start"
              onClick={() => router.push("/owner/khatabook/vendor-ledger")}
            >
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-5 w-5" />
                <span className="font-semibold">Vendor Ledger</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Manage supplier accounts and dues
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex-col items-start"
              onClick={() => router.push("/owner/staff")}
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5" />
                <span className="font-semibold">Staff Management</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Add and manage staff members
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex-col items-start"
              onClick={() => router.push("/owner/staff/attendance")}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">Attendance</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Mark daily staff attendance
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex-col items-start"
              onClick={() => router.push("/owner/staff/salary")}
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5" />
                <span className="font-semibold">Salary Management</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Generate and track staff salaries
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex-col items-start"
              onClick={() => router.push("/owner/spending-reports")}
            >
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-5 w-5" />
                <span className="font-semibold">Spending Reports</span>
              </div>
              <span className="text-xs text-muted-foreground">
                View detailed finance reports
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
