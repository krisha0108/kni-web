"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getMovementTypeLabel, getMovementTypeColor } from "@/lib/warehouse";
import { formatDateTime } from "@/lib/utils";

interface StockMovement {
  id: string;
  movementType: string;
  quantity: number;
  balanceAfter: number;
  notes: string | null;
  createdAt: string;
  inventory: {
    id: string;
    partItem: {
      id: string;
      name: string;
    };
  };
  creator: {
    id: string;
    name: string;
    email: string;
  };
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchMovements();
  }, [movementTypeFilter]);

  const fetchMovements = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (movementTypeFilter !== "all") params.append("movementType", movementTypeFilter);

      const response = await fetch("/api/admin/warehouse/stock-movements?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setMovements(data.data.movements || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch stock movements",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Stock Movements</h1>
        <p className="text-muted-foreground">Complete audit trail of all inventory changes</p>
      </div>

      <div className="flex items-center gap-4">
        <ClientOnly>
          <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="INWARD_PURCHASE">Inward - Purchase</SelectItem>
              <SelectItem value="INWARD_RETURN">Inward - Return</SelectItem>
              <SelectItem value="OUTWARD_USAGE">Outward - Usage</SelectItem>
              <SelectItem value="OUTWARD_WASTAGE">Outward - Wastage</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead>Movement Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Balance After</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No stock movements found.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="font-medium">
                    {formatDateTime(movement.createdAt)}
                  </TableCell>
                  <TableCell>{movement.inventory.partItem.name}</TableCell>
                  <TableCell>
                    <Badge variant={getMovementTypeColor(movement.movementType as any)}>
                      {getMovementTypeLabel(movement.movementType as any)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {movement.movementType.startsWith("INWARD") ? "+" : "-"}
                    {movement.quantity}
                  </TableCell>
                  <TableCell className="font-mono">{movement.balanceAfter}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{movement.creator?.name || "System"}</p>
                      <p className="text-xs text-muted-foreground">{movement.creator?.email || "-"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {movement.notes || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
