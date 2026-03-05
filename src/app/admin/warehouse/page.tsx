"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, TrendingDown, TrendingUp } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  criticalStockItems: number;
  totalValue: number;
  recentMovements: Array<{
    id: string;
    movementType: string;
    quantity: number;
    createdAt: string;
    inventory: {
      partItem: {
        name: string;
      };
    };
  }>;
}

export default function WarehouseDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      const [inventoryRes, alertsRes, movementsRes] = await Promise.all([
        fetch("/api/admin/warehouse/inventory"),
        fetch("/api/admin/warehouse/alerts"),
        fetch("/api/admin/warehouse/stock-movements?pageSize=5"),
      ]);

      const inventoryData = await inventoryRes.json();
      const alertsData = await alertsRes.json();
      const movementsData = await movementsRes.json();

      if (inventoryData.ok && alertsData.ok && movementsData.ok) {
        const inventories = inventoryData.data.inventories || [];
        const totalValue = inventories.reduce(
          (sum: number, inv: any) => sum + inv.currentStock * inv.partItem.price,
          0
        );

        setStats({
          totalItems: inventories.length,
          lowStockItems: alertsData.data.lowCount || 0,
          criticalStockItems: alertsData.data.criticalCount || 0,
          totalValue,
          recentMovements: movementsData.data.movements || [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Warehouse Management</h1>
        <p className="text-muted-foreground">Monitor inventory levels and stock movements</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">Parts in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.lowStockItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.criticalStockItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats?.totalValue || 0)}</div>
            <p className="text-xs text-muted-foreground">Current stock value</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push("/admin/warehouse/inventory")}
            >
              <Package className="mr-2 h-4 w-4" />
              View All Inventory
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push("/admin/warehouse/alerts")}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              View Low Stock Alerts
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push("/admin/warehouse/movements")}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              View Stock Movements
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Movements</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.recentMovements || stats.recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent stock movements
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {movement.movementType.startsWith("INWARD") ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">{movement.inventory.partItem.name}</span>
                    </div>
                    <Badge
                      variant={
                        movement.movementType.startsWith("INWARD") ? "success" : "destructive"
                      }
                    >
                      {movement.movementType.startsWith("INWARD") ? "+" : "-"}
                      {movement.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}