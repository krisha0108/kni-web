"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";
import { Plus, Eye, Pencil, Trash2, Search, Building2 } from "lucide-react";
import { getWarrantyStatus, getEquipmentStatusColor, getEquipmentStatusLabel } from "@/lib/equipment";
import { formatDate } from "@/lib/utils";
import { ExportButton } from "@/components/export-button";
import { useRestaurant } from "@/contexts/restaurant-context";

interface Equipment {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  purchaseDate: string;
  warrantyEndDate: string | null;
  status: string;
  restaurant: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export default function OwnerEquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    restaurantId: "",
    name: "",
    category: "",
    purchaseDate: "",
    warrantyEndDate: "",
    serialNumber: "",
    notes: "",
    billImageUrl: "",
    warrantyCardUrl: "",
    photoUrls: [] as string[],
  });

  const [categories, setCategories] = useState<Array<{ id: string; name: string; category: { id: string; name: string } }>>([]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchCategories();
      fetchEquipment();
    }
  }, [selectedRestaurant, search, statusFilter]);

  // Update formData.restaurantId when selectedRestaurant changes
  useEffect(() => {
    if (selectedRestaurant) {
      setFormData(prev => ({ ...prev, restaurantId: selectedRestaurant.restaurantId }));
    }
  }, [selectedRestaurant]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/public/subcategories");
      const data = await response.json();
      if (data.ok && data.data) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching equipment categories:", error);
    }
  };

  const fetchEquipment = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("restaurantId", selectedRestaurant.restaurantId);
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch("/api/owner/equipment?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setEquipment(data.data.items || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch equipment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch equipment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.restaurantId || !formData.name || !formData.category || !formData.purchaseDate) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const payload: any = {
        restaurantId: formData.restaurantId,
        name: formData.name,
        category: formData.category,
        purchaseDate: new Date(formData.purchaseDate).toISOString(),
        serialNumber: formData.serialNumber || undefined,
        notes: formData.notes || undefined,
        billImageUrl: formData.billImageUrl || undefined,
        warrantyCardUrl: formData.warrantyCardUrl || undefined,
        photoUrls: formData.photoUrls.length > 0 ? formData.photoUrls : undefined,
      };

      if (formData.warrantyEndDate) {
        payload.warrantyEndDate = new Date(formData.warrantyEndDate).toISOString();
      }

      const response = await fetch("/api/owner/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Equipment added successfully",
        });
        setIsCreateOpen(false);
        setFormData({
          restaurantId: "",
          name: "",
          category: "",
          purchaseDate: "",
          warrantyEndDate: "",
          serialNumber: "",
          notes: "",
          billImageUrl: "",
          warrantyCardUrl: "",
          photoUrls: [],
        });
        fetchEquipment();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create equipment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create equipment",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this equipment?")) return;

    try {
      const response = await fetch(`/api/owner/equipment/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Equipment deleted successfully",
        });
        fetchEquipment();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete equipment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete equipment",
        variant: "destructive",
      });
    }
  };

  if (!selectedRestaurant) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Please select a restaurant</p>
          <p className="text-sm text-muted-foreground mt-2">Use the restaurant switcher in the header to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Equipment</h1>
          <p className="text-muted-foreground">Manage your kitchen equipment and appliances for {selectedRestaurant.restaurant.name}</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            endpoint="/api/owner/exports/equipment"
            filename={`equipment-${new Date().toISOString().split('T')[0]}.csv`}
          />
          <ClientOnly>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Equipment</DialogTitle>
              <DialogDescription>
                Add new equipment to track warranty, maintenance, and service history.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Restaurant</Label>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedRestaurant?.restaurant.name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Equipment Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Commercial Oven"
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <ClientOnly>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No categories available
                        </div>
                      ) : (
                        categories.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.category.name} - {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </ClientOnly>
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No equipment categories available. Please contact admin.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  placeholder="ABC123456"
                />
              </div>

              <div className="space-y-2">
                <Label>Purchase Date *</Label>
                <Input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Warranty End Date</Label>
                <Input
                  type="date"
                  value={formData.warrantyEndDate}
                  onChange={(e) => setFormData({ ...formData, warrantyEndDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the equipment"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Product Bill Image</Label>
                <ImageUpload
                  value={formData.billImageUrl}
                  onChange={(url) => setFormData({ ...formData, billImageUrl: url })}
                  folder="equipment/bills"
                  label="Upload Bill"
                />
              </div>

              <div className="space-y-2">
                <Label>Warranty Card Image</Label>
                <ImageUpload
                  value={formData.warrantyCardUrl}
                  onChange={(url) => setFormData({ ...formData, warrantyCardUrl: url })}
                  folder="equipment/warranty-cards"
                  label="Upload Warranty Card"
                />
              </div>

              <div className="space-y-2">
                <Label>Equipment Photos (Max 5)</Label>
                <MultipleImageUpload
                  value={formData.photoUrls}
                  onChange={(urls) => setFormData({ ...formData, photoUrls: urls })}
                  folder="equipment/photos"
                  maxImages={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Add Equipment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </ClientOnly>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ClientOnly>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="IN_USE">In Use</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              <SelectItem value="RETIRED">Retired</SelectItem>
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Warranty Status</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : equipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No equipment found. Add your first equipment to get started.
                </TableCell>
              </TableRow>
            ) : (
              equipment.map((item) => {
                const warrantyStatus = getWarrantyStatus(item.warrantyEndDate);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.serialNumber || "-"}
                    </TableCell>
                    <TableCell>{item.restaurant.name}</TableCell>
                    <TableCell>{formatDate(item.purchaseDate)}</TableCell>
                    <TableCell>
                      <Badge variant={warrantyStatus.color === "green" ? "success" : warrantyStatus.color === "yellow" ? "warning" : warrantyStatus.color === "red" ? "destructive" : "secondary"}>
                        {warrantyStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEquipmentStatusColor(item.status)}>
                        {getEquipmentStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/owner/equipment/${item.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
