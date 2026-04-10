"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";
import { Plus, Eye, Pencil, Trash2, Search, Building2, Filter, X, ArrowUpDown, Wrench } from "lucide-react";
import { getWarrantyStatus, getEquipmentStatusColor, getEquipmentStatusLabel } from "@/lib/equipment";
import { formatDate } from "@/lib/utils";
import { ExportButton } from "@/components/export-button";
import { useRestaurant } from "@/contexts/restaurant-context";

interface Category {
  id: string;
  name: string;
  subCategories?: SubCategory[];
}

interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
}

interface Equipment {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string;
  warrantyEndDate: string | null;
  installLocation: string | null;
  status: string;
  category: { id: string; name: string } | null;
  subCategory: { id: string; name: string } | null;
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
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterWarranty, setFilterWarranty] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "name-asc" | "name-desc">("date-desc");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    restaurantId: "",
    categoryId: "",
    subCategoryId: "",
    brand: "",
    model: "",
    purchaseDate: "",
    warrantyEndDate: "",
    serialNumber: "",
    installLocation: "",
    notes: "",
    billImageUrl: "",
    warrantyCardUrl: "",
    photoUrls: [] as string[],
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

  useEffect(() => {
    fetchCategories();
    if (selectedRestaurant) {
      fetchEquipment();
    }
  }, [selectedRestaurant, page]);

  // Update formData.restaurantId when selectedRestaurant changes
  useEffect(() => {
    if (selectedRestaurant) {
      setFormData(prev => ({ ...prev, restaurantId: selectedRestaurant.restaurantId }));
    }
  }, [selectedRestaurant]);

  // Update subcategories when category changes
  useEffect(() => {
    if (formData.categoryId) {
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      setSubCategories(selectedCategory?.subCategories || []);
      setFormData(prev => ({ ...prev, subCategoryId: "" })); // Reset subcategory
    } else {
      setSubCategories([]);
    }
  }, [formData.categoryId, categories]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/public/categories");
      const data = await response.json();
      if (data.ok && data.data) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchEquipment = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/owner/equipment?restaurantId=${selectedRestaurant.restaurantId}&page=${page}&pageSize=20`);
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setEquipment(Array.isArray(items) ? items : []);
        setTotalPages(Math.ceil(total / 20) || 1);
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
      if (!formData.restaurantId || !formData.categoryId || !formData.purchaseDate) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Derive equipment name from category/subcategory
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      const selectedSubCategory = subCategories.find(sc => sc.id === formData.subCategoryId);
      const equipmentName = selectedSubCategory?.name || selectedCategory?.name || "Equipment";

      const payload: any = {
        restaurantId: formData.restaurantId,
        name: equipmentName,
        categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId || undefined,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        purchaseDate: new Date(formData.purchaseDate).toISOString(),
        serialNumber: formData.serialNumber || undefined,
        installLocation: formData.installLocation || undefined,
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
          restaurantId: selectedRestaurant?.restaurantId || "",
          categoryId: "",
          subCategoryId: "",
          brand: "",
          model: "",
          purchaseDate: "",
          warrantyEndDate: "",
          serialNumber: "",
          installLocation: "",
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

  const handleEdit = (item: Equipment) => {
    setEditingId(item.id);
    setFormData({
      restaurantId: item.restaurant.id,
      categoryId: item.category?.id || "",
      subCategoryId: item.subCategory?.id || "",
      brand: item.brand || "",
      model: item.model || "",
      purchaseDate: item.purchaseDate ? item.purchaseDate.split("T")[0] : "",
      warrantyEndDate: item.warrantyEndDate ? item.warrantyEndDate.split("T")[0] : "",
      serialNumber: item.serialNumber || "",
      installLocation: item.installLocation || "",
      notes: "",
      billImageUrl: "",
      warrantyCardUrl: "",
      photoUrls: [],
    });
    // Set subcategories for the selected category
    if (item.category?.id) {
      const selectedCategory = categories.find(c => c.id === item.category?.id);
      setSubCategories(selectedCategory?.subCategories || []);
    }
    setIsCreateOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      restaurantId: selectedRestaurant?.restaurantId || "",
      categoryId: "",
      subCategoryId: "",
      brand: "",
      model: "",
      purchaseDate: "",
      warrantyEndDate: "",
      serialNumber: "",
      installLocation: "",
      notes: "",
      billImageUrl: "",
      warrantyCardUrl: "",
      photoUrls: [],
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      const selectedSubCategory = subCategories.find(sc => sc.id === formData.subCategoryId);
      const equipmentName = selectedSubCategory?.name || selectedCategory?.name || "Equipment";

      const payload: any = {
        name: equipmentName,
        categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId || undefined,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        serialNumber: formData.serialNumber || undefined,
        installLocation: formData.installLocation || undefined,
        notes: formData.notes || undefined,
        billImageUrl: formData.billImageUrl || undefined,
        warrantyCardUrl: formData.warrantyCardUrl || undefined,
        photoUrls: formData.photoUrls.length > 0 ? formData.photoUrls : undefined,
      };

      if (formData.purchaseDate) {
        payload.purchaseDate = new Date(formData.purchaseDate).toISOString();
      }
      if (formData.warrantyEndDate) {
        payload.warrantyEndDate = new Date(formData.warrantyEndDate).toISOString();
      }

      const response = await fetch(`/api/owner/equipment/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Equipment updated successfully" });
        setIsCreateOpen(false);
        resetForm();
        fetchEquipment();
      } else {
        toast({ title: "Error", description: data.error || "Failed to update equipment", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update equipment", variant: "destructive" });
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

  // Filtered and sorted equipment
  const filteredEquipment = useMemo(() => {
    let filtered = [...equipment];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        (item.category?.name || "").toLowerCase().includes(query) ||
        (item.subCategory?.name || "").toLowerCase().includes(query) ||
        (item.brand || "").toLowerCase().includes(query) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(query)) ||
        getEquipmentStatusLabel(item.status).toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    // Warranty filter
    if (filterWarranty !== "all") {
      filtered = filtered.filter((item) => {
        const warrantyStatus = getWarrantyStatus(item.warrantyEndDate);
        if (filterWarranty === "active" && warrantyStatus.color === "green") return true;
        if (filterWarranty === "expiring" && warrantyStatus.color === "yellow") return true;
        if (filterWarranty === "expired" && warrantyStatus.color === "red") return true;
        if (filterWarranty === "no-warranty" && warrantyStatus.color === "gray") return true;
        return false;
      });
    }

    // Date range filter (purchase date)
    if (filterDateFrom) {
      filtered = filtered.filter((item) =>
        new Date(item.purchaseDate) >= new Date(filterDateFrom)
      );
    }
    if (filterDateTo) {
      filtered = filtered.filter((item) =>
        new Date(item.purchaseDate) <= new Date(filterDateTo)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
        case "date-asc":
          return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "name-asc":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [equipment, searchQuery, filterStatus, filterWarranty, filterDateFrom, filterDateTo, sortBy]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== "all") count++;
    if (filterWarranty !== "all") count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    return count;
  }, [filterStatus, filterWarranty, filterDateFrom, filterDateTo]);

  // Clear all filters
  const clearFilters = () => {
    setFilterStatus("all");
    setFilterWarranty("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const userRole = selectedRestaurant?.role;
  const canCreate = userRole === "OWNER" || userRole === "MANAGER";
  const canDelete = userRole === "OWNER";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Equipment</h1>
          <p className="text-muted-foreground">Manage your kitchen equipment and appliances for {selectedRestaurant.restaurant.name}</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            endpoint="/api/owner/exports/equipment"
            filename={`equipment-${new Date().toISOString().split('T')[0]}.csv`}
          />
          {canCreate && (
          <ClientOnly>
            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Update equipment details." : "Add new equipment to track warranty, maintenance, and service history."}
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
                <Label>Category *</Label>
                <ClientOnly>
                  <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
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
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </ClientOnly>
              </div>

              <div className="space-y-2">
                <Label>Subcategory</Label>
                <ClientOnly>
                  <Select
                    value={formData.subCategoryId}
                    onValueChange={(v) => setFormData({ ...formData, subCategoryId: v })}
                    disabled={!formData.categoryId || subCategories.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.categoryId ? "Select subcategory" : "Select category first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subCategories.map((sc) => (
                        <SelectItem key={sc.id} value={sc.id}>
                          {sc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ClientOnly>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., Samsung"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., XYZ-123"
                  />
                </div>
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
                <Label>Install Location</Label>
                <Input
                  value={formData.installLocation}
                  onChange={(e) => setFormData({ ...formData, installLocation: e.target.value })}
                  placeholder="e.g., Main Kitchen"
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
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={editingId ? handleUpdate : handleCreate}>
                {editingId ? "Save Changes" : "Add Equipment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </ClientOnly>
          )}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, category, brand, serial number..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Button */}
            <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Filter Equipment</DialogTitle>
                  <DialogDescription>
                    Apply filters to narrow down your equipment list
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label>Equipment Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="IN_USE">In Use</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="RETIRED">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Warranty Filter */}
                  <div className="space-y-2">
                    <Label>Warranty Status</Label>
                    <Select value={filterWarranty} onValueChange={setFilterWarranty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Warranty Status</SelectItem>
                        <SelectItem value="active">Active (Valid)</SelectItem>
                        <SelectItem value="expiring">Expiring Soon</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="no-warranty">No Warranty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Purchase Date Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Purchased From</Label>
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Purchased To</Label>
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <Button onClick={() => setIsFilterDialogOpen(false)}>
                    Apply Filters
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || activeFiltersCount > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchQuery}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {filterStatus !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {getEquipmentStatusLabel(filterStatus)}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilterStatus("all")}
                  />
                </Badge>
              )}
              {filterWarranty !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Warranty: {filterWarranty === "no-warranty" ? "No Warranty" : filterWarranty.charAt(0).toUpperCase() + filterWarranty.slice(1)}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilterWarranty("all")}
                  />
                </Badge>
              )}
              {filterDateFrom && (
                <Badge variant="secondary" className="gap-1">
                  From: {filterDateFrom}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilterDateFrom("")}
                  />
                </Badge>
              )}
              {filterDateTo && (
                <Badge variant="secondary" className="gap-1">
                  To: {filterDateTo}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilterDateTo("")}
                  />
                </Badge>
              )}
            </div>
          )}

          {/* Results Count */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredEquipment.length} of {equipment.length} equipment items
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-lg">
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              
              <TableHead className="hidden md:table-cell">Brand</TableHead>
              <TableHead className="hidden lg:table-cell">Serial Number</TableHead>
              <TableHead className="hidden lg:table-cell">Purchase Date</TableHead>
              <TableHead className="hidden md:table-cell">Warranty</TableHead>
              <TableHead>Status</TableHead>
              
              <TableHead className="w-[100px] sm:w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredEquipment.length === 0 && equipment.length > 0 ? (
              
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Search className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No equipment matches your filters</p>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear All Filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : equipment.length === 0 ? (
              
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No equipment found. Add your first equipment to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredEquipment.map((item) => {
                const warrantyStatus = getWarrantyStatus(item.warrantyEndDate);
                return (
                  
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div>
                        <p>{item.category?.name || "-"}</p>
                        {item.subCategory && (
                          <p className="text-xs text-muted-foreground">{item.subCategory.name}</p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="hidden md:table-cell">{item.brand || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-sm">
                      {item.serialNumber || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(item.purchaseDate)}</TableCell>
                    
                    <TableCell className="hidden md:table-cell">
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
                        {canCreate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Request Service"
                            onClick={() => {
                              const params = new URLSearchParams();
                              params.set("equipmentId", item.id);
                              params.set("equipmentName", item.name);
                              if (item.category?.id) params.set("categoryId", item.category.id);
                              if (item.category?.name) params.set("categoryName", item.category.name);
                              if (item.subCategory?.id) params.set("subCategoryId", item.subCategory.id);
                              if (item.subCategory?.name) params.set("subCategoryName", item.subCategory.name);
                              router.push(`/owner/request-service?${params.toString()}`);
                            }}
                          >
                            <Wrench className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {canCreate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Equipment"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View Details"
                          onClick={() => router.push(`/owner/equipment/${item.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
                    
                    
                    
                    
                  
              
              
              
              
              

      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4 p-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}
    </div>
  );
}