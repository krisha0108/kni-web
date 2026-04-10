"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Eye } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Alert {
  id: string;
  currentStock: number;
  lowStockThreshold: number;
  severity: "OUT_OF_STOCK" | "CRITICAL" | "LOW";
  partItem: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: {
      id: string;
      name: string;
    };
  };
}

export default function WarehouseAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({ criticalCount: 0, lowCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, page]);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (severityFilter !== "all") params.append("severity", severityFilter);
      params.set("page", page.toString());
      params.set("pageSize", "20");

      const response = await fetch("/api/admin/warehouse/alerts?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setAlerts(data.data?.alerts || data.data?.items || []);
        setStats({
          criticalCount: data.data?.criticalCount || 0,
          lowCount: data.data?.lowCount || 0,
        });
        const total = data.data?.total || 0;
        setTotalPages(Math.ceil(total / 20) || 1);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch alerts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "OUT_OF_STOCK":
        return <Badge variant="destructive">Out of Stock</Badge>;
      case "CRITICAL":
        return <Badge variant="destructive">Critical</Badge>;
      case "LOW":
        return <Badge variant="warning">Low Stock</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Low Stock Alerts</h1>
        <p className="text-muted-foreground">Items requiring immediate attention</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600">{stats.criticalCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="rounded-full bg-orange-100 p-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{stats.lowCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="rounded-full bg-gray-100 p-3">
              <AlertTriangle className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Alerts</p>
              <p className="text-2xl font-bold">{alerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <ClientOnly>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical Only</SelectItem>
              <SelectItem value="low">Low Stock Only</SelectItem>
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      <div className="border rounded-lg">
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Part Name</TableHead>
              
              <TableHead>Category</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : alerts.length === 0 ? (
              
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {severityFilter === "all"
                    ? "No low stock alerts. All inventory levels are healthy!"
                    : `No ${severityFilter} alerts found.`}
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alert) => (
                
                <TableRow key={alert.id}>
                  <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                  <TableCell className="font-medium">{alert.partItem.name}</TableCell>
                  <TableCell>{alert.partItem.category.name}</TableCell>
                  <TableCell>
                    <span
                      className={`font-mono font-bold ${
                        alert.severity === "OUT_OF_STOCK"
                          ? "text-red-600"
                          : alert.severity === "CRITICAL"
                          ? "text-red-600"
                          : "text-orange-600"
                      }`}
                    >
                      {alert.currentStock}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {alert.lowStockThreshold}
                    </span>
                  </TableCell>
                  
                  <TableCell>{formatPrice(alert.partItem.price)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/warehouse/inventory/${alert.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4 p-4">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}