"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Search, Download, PackagePlus } from "lucide-react";
import { getStockStatus } from "@/lib/warehouse";
import { formatPrice, formatDate } from "@/lib/utils";

interface Inventory {
  id: string;
  partItemId: string;
  currentStock: number;
  lowStockThreshold: number;
  lastRestockedAt: string | null;
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

interface PartItem {
  id: string;
  name: string;
  category: {
    name: string;
  };
}

export default function WarehouseInventoryPage() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [partItems, setPartItems] = useState<PartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    partItemId: "",
    currentStock: "",
    lowStockThreshold: "10",
  });

  // Quick Add Stock
  const [quickStockOpen, setQuickStockOpen] = useState(false);
  const [quickStockInventory, setQuickStockInventory] = useState<Inventory | null>(null);
  const [quickStockQty, setQuickStockQty] = useState("");
  const [quickStockNotes, setQuickStockNotes] = useState("");
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleQuickAddStock = async () => {
    if (!quickStockInventory || !quickStockQty || parseInt(quickStockQty) <= 0) {
      toast({ title: "Error", description: "Enter a valid quantity", variant: "destructive" });
      return;
    }
    setIsAddingStock(true);
    try {
      const res = await fetch("/api/admin/warehouse/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: quickStockInventory.id,
          movementType: "INWARD_PURCHASE",
          quantity: parseInt(quickStockQty),
          notes: quickStockNotes || `Quick stock add from inventory list`,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: `Added ${quickStockQty} units to ${quickStockInventory.partItem.name}` });
        setQuickStockOpen(false);
        setQuickStockQty("");
        setQuickStockNotes("");
        setQuickStockInventory(null);
        fetchInventories();
      } else {
        toast({ title: "Error", description: data.error || "Failed to add stock", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add stock", variant: "destructive" });
    } finally {
      setIsAddingStock(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventories();
    }, 300);
    fetchPartItems();
    return () => clearTimeout(timer);
  }, [search, lowStockFilter, page]);

  const fetchInventories = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (lowStockFilter) params.append("lowStock", "true");
      params.set("page", page.toString());
      params.set("pageSize", "20");

      const response = await fetch("/api/admin/warehouse/inventory?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setInventories(data.data?.inventories || data.data?.items || []);
        const total = data.data?.total || 0;
        setTotalPages(Math.ceil(total / 20) || 1);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inventory",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPartItems = async () => {
    try {
      const response = await fetch("/api/admin/parts?pageSize=200");
      const data = await response.json();
      if (data.ok) {
        setPartItems(data.data?.items || data.data || []);
      }
    } catch (error) {
      console.error("Error fetching part items:", error);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.partItemId) {
        toast({
          title: "Error",
          description: "Please select a part item",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        partItemId: formData.partItemId,
        currentStock: formData.currentStock ? parseInt(formData.currentStock, 10) : 0,
        lowStockThreshold: formData.lowStockThreshold
          ? parseInt(formData.lowStockThreshold, 10)
          : 10,
      };

      const response = await fetch("/api/admin/warehouse/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Inventory initialized successfully",
        });
        setIsCreateOpen(false);
        setFormData({
          partItemId: "",
          currentStock: "",
          lowStockThreshold: "10",
        });
        fetchInventories();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to initialize inventory",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize inventory",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/exports/inventory");
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Inventory exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export inventory",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Warehouse Inventory</h1>
          <p className="text-muted-foreground">Manage part stock levels and thresholds</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Initialize Inventory
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Initialize Inventory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Part Item *</Label>
                <ClientOnly>
                  <Select
                    value={formData.partItemId}
                    onValueChange={(v) => setFormData({ ...formData, partItemId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select part item" />
                    </SelectTrigger>
                    <SelectContent>
                      {partItems.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.name} ({part.category.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ClientOnly>
              </div>

              <div className="space-y-2">
                <Label>Initial Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Low Stock Threshold *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, lowStockThreshold: e.target.value })
                  }
                  placeholder="10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Initialize</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="lowStock"
            checked={lowStockFilter}
            onChange={(e) => setLowStockFilter(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="lowStock" className="cursor-pointer">
            Show only low stock
          </Label>
        </div>
      </div>

      <div className="border rounded-lg">
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part Name</TableHead>
              <TableHead>Category</TableHead>
              
              <TableHead>Current Stock</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Status</TableHead>
              
              <TableHead>Last Restocked</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : inventories.length === 0 ? (
              
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No inventory items found. Initialize inventory for parts to get started.
                </TableCell>
              </TableRow>
            ) : (
              inventories.map((inventory) => {
                const stockStatus = getStockStatus(
                  inventory.currentStock,
                  inventory.lowStockThreshold
                );
                const totalValue = inventory.currentStock * inventory.partItem.price;

                return (
                  
                  <TableRow key={inventory.id}>
                    <TableCell className="font-medium">{inventory.partItem.name}</TableCell>
                    <TableCell>{inventory.partItem.category.name}</TableCell>
                    <TableCell>
                      <span className="font-mono">{inventory.currentStock}</span>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {inventory.lowStockThreshold}
                      </span>
                    </TableCell>
                    
                    <TableCell>{formatPrice(inventory.partItem.price)}</TableCell>
                    <TableCell className="font-medium">{formatPrice(totalValue)}</TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.color}>{stockStatus.label}</Badge>
                    </TableCell>
                    
                    <TableCell>
                      {inventory.lastRestockedAt
                        ? formatDate(inventory.lastRestockedAt)
                        : "Never"}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Add Stock"
                          onClick={() => {
                            setQuickStockInventory(inventory);
                            setQuickStockQty("");
                            setQuickStockNotes("");
                            setQuickStockOpen(true);
                          }}
                        >
                          <PackagePlus className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View Details"
                          onClick={() =>
                            router.push(`/admin/warehouse/inventory/${inventory.id}`)
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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

      {/* Quick Add Stock Dialog */}
      <Dialog open={quickStockOpen} onOpenChange={setQuickStockOpen}>
        <DialogContent className="max-w-sm w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-green-600" />
              Add Stock
            </DialogTitle>
          </DialogHeader>
          {quickStockInventory && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{quickStockInventory.partItem.name}</p>
                <p className="text-sm text-muted-foreground">
                  Current stock: <span className="font-mono font-semibold">{quickStockInventory.currentStock}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Quantity to Add *</Label>
                <Input
                  type="number"
                  min="1"
                  value={quickStockQty}
                  onChange={(e) => setQuickStockQty(e.target.value)}
                  placeholder="e.g. 50"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={quickStockNotes}
                  onChange={(e) => setQuickStockNotes(e.target.value)}
                  placeholder="e.g. Purchased from supplier"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickStockOpen(false)}>Cancel</Button>
            <Button onClick={handleQuickAddStock} disabled={isAddingStock || !quickStockQty}>
              {isAddingStock ? "Adding..." : `Add ${quickStockQty || 0} Units`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}