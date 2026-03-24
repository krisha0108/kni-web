"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import { getStockStatus, getMovementTypeLabel, getMovementTypeColor } from "@/lib/warehouse";
import { formatPrice, formatDateTime } from "@/lib/utils";

interface Inventory {
  id: string;
  partItemId: string;
  currentStock: number;
  lowStockThreshold: number;
  lastRestockedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  stockMovements: Array<{
    id: string;
    movementType: string;
    quantity: number;
    balanceAfter: number;
    notes: string | null;
    createdAt: string;
    creator: {
      id: string;
      name: string;
    };
  }>;
}

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isThresholdOpen, setIsThresholdOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [threshold, setThreshold] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const [movementData, setMovementData] = useState({
    movementType: "INWARD_PURCHASE" as const,
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    fetchInventory();
  }, [resolvedParams.id]);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/warehouse/inventory/${resolvedParams.id}`);
      const data = await response.json();
      if (data.ok) {
        setInventory(data.data);
        setThreshold(data.data?.lowStockThreshold?.toString() || "10");
      } else {
        toast({
          title: "Error",
          description: data.error || "Inventory not found",
          variant: "destructive",
        });
        router.push("/admin/warehouse/inventory");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inventory details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateThreshold = async () => {
    try {
      const response = await fetch(`/api/admin/warehouse/inventory/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lowStockThreshold: parseInt(threshold, 10),
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Threshold updated successfully",
        });
        setIsThresholdOpen(false);
        fetchInventory();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update threshold",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update threshold",
        variant: "destructive",
      });
    }
  };

  const handleRecordMovement = async () => {
    try {
      if (!movementData.quantity) {
        toast({
          title: "Error",
          description: "Please enter a quantity",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/admin/warehouse/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: resolvedParams.id,
          movementType: movementData.movementType,
          quantity: parseInt(movementData.quantity, 10),
          notes: movementData.notes || undefined,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Stock movement recorded successfully",
        });
        setIsMovementOpen(false);
        setMovementData({
          movementType: "INWARD_PURCHASE",
          quantity: "",
          notes: "",
        });
        fetchInventory();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to record movement",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record movement",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading...</p>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Inventory not found</p>
      </div>
    );
  }

  const stockStatus = getStockStatus(inventory.currentStock, inventory.lowStockThreshold);
  const totalValue = inventory.currentStock * inventory.partItem.price;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/warehouse/inventory")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{inventory.partItem.name}</h1>
          <p className="text-muted-foreground">{inventory.partItem.category.name}</p>
        </div>
        <Badge variant={stockStatus.color}>{stockStatus.label}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{inventory.currentStock}</div>
            <p className="text-sm text-muted-foreground mt-1">units available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPrice(totalValue)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              @ {formatPrice(inventory.partItem.price)}/unit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Threshold</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsThresholdOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{inventory.lowStockThreshold}</div>
            <p className="text-sm text-muted-foreground mt-1">units minimum</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Stock Movements</h2>
        <Button onClick={() => setIsMovementOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Movement
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {inventory.stockMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No stock movements recorded yet.
            </p>
          ) : (
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  
                  <TableHead>Quantity</TableHead>
                  <TableHead>Balance After</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {inventory.stockMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDateTime(movement.createdAt)}</TableCell>
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
                    
                    <TableCell>{movement.creator?.name || "System"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
                    
                    
              
                  
            
          )}
        </CardContent>
      </Card>

      {/* Update Threshold Dialog */}
      <Dialog open={isThresholdOpen} onOpenChange={setIsThresholdOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Low Stock Threshold</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Threshold (units)</Label>
              <Input
                type="number"
                min="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                You'll be alerted when stock falls below this level
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsThresholdOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateThreshold}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Movement Dialog */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Movement Type *</Label>
              <ClientOnly>
                <Select
                  value={movementData.movementType}
                  onValueChange={(v: any) =>
                    setMovementData({ ...movementData, movementType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INWARD_PURCHASE">Inward - Purchase</SelectItem>
                    <SelectItem value="INWARD_RETURN">Inward - Return</SelectItem>
                    <SelectItem value="OUTWARD_USAGE">Outward - Usage</SelectItem>
                    <SelectItem value="OUTWARD_WASTAGE">Outward - Wastage</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </ClientOnly>
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={movementData.quantity}
                onChange={(e) =>
                  setMovementData({ ...movementData, quantity: e.target.value })
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={movementData.notes}
                onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                placeholder="Optional notes about this movement"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovementOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordMovement}>Record Movement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}