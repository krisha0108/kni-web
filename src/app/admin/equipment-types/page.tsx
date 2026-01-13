"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wrench, Settings, Package } from "lucide-react";

interface EquipmentType {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  avgLifespanMonths: number | null;
  avgWarrantyMonths: number | null;
  imageUrl: string | null;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    icon: string | null;
  };
  _count: {
    equipmentInstances: number;
    serviceTemplates: number;
    partTemplates: number;
  };
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

export default function EquipmentTypesPage() {
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<EquipmentType | null>(null);
  const [deletingType, setDeletingType] = useState<EquipmentType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    description: "",
    brand: "",
    avgLifespanMonths: "",
    avgWarrantyMonths: "",
    imageUrl: "",
  });

  useEffect(() => {
    fetchCategories();
    fetchTypes();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/equipment-categories");
      const data = await response.json();

      if (data.ok) {
        setCategories(data.data.filter((c: Category & { isActive: boolean }) => c.isActive));
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchTypes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/equipment-types");
      const data = await response.json();

      if (data.ok) {
        setTypes(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch equipment types",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch equipment types",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingType(null);
    setFormData({
      categoryId: "",
      name: "",
      description: "",
      brand: "",
      avgLifespanMonths: "",
      avgWarrantyMonths: "",
      imageUrl: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (type: EquipmentType) => {
    setEditingType(type);
    setFormData({
      categoryId: type.category.id,
      name: type.name,
      description: type.description || "",
      brand: type.brand || "",
      avgLifespanMonths: type.avgLifespanMonths?.toString() || "",
      avgWarrantyMonths: type.avgWarrantyMonths?.toString() || "",
      imageUrl: type.imageUrl || "",
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (type: EquipmentType) => {
    setDeletingType(type);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.categoryId) {
      toast({
        title: "Validation Error",
        description: "Name and category are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const url = editingType
        ? `/api/admin/equipment-types/${editingType.id}`
        : "/api/admin/equipment-types";

      const method = editingType ? "PATCH" : "POST";

      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        brand: formData.brand.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
      };

      if (!editingType) {
        payload.categoryId = formData.categoryId;
      }

      if (formData.avgLifespanMonths) {
        payload.avgLifespanMonths = parseInt(formData.avgLifespanMonths);
      }

      if (formData.avgWarrantyMonths) {
        payload.avgWarrantyMonths = parseInt(formData.avgWarrantyMonths);
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: editingType
            ? "Equipment type updated successfully"
            : "Equipment type created successfully",
        });
        fetchTypes();
        setIsDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save equipment type",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save equipment type",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;

    try {
      const response = await fetch(`/api/admin/equipment-types/${deletingType.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Equipment type deleted successfully",
        });
        fetchTypes();
        setIsDeleteDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete equipment type",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete equipment type",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading equipment types...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Equipment Types</h1>
          <p className="text-muted-foreground">
            Manage equipment types and their service/part templates
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Equipment Type
        </Button>
      </div>

      {types.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No equipment types found</p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Equipment Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {types.map((type) => (
            <Card key={type.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {type.category.icon && (
                      <span className="text-2xl">{type.category.icon}</span>
                    )}
                    <div>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      <CardDescription>
                        {type.category.name}
                        {type.brand && ` • Brands: ${type.brand}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={type.isActive ? "default" : "secondary"}>
                    {type.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {type.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {type.description}
                  </p>
                )}

                <div className="flex items-center gap-6 text-sm mb-4">
                  {type.avgLifespanMonths && (
                    <div>
                      <span className="text-muted-foreground">Lifespan:</span>{" "}
                      <span className="font-medium">
                        {Math.floor(type.avgLifespanMonths / 12)} years
                      </span>
                    </div>
                  )}
                  {type.avgWarrantyMonths && (
                    <div>
                      <span className="text-muted-foreground">Warranty:</span>{" "}
                      <span className="font-medium">
                        {type.avgWarrantyMonths} months
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{type._count.equipmentInstances}</span>{" "}
                      <span className="text-muted-foreground">instances</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{type._count.serviceTemplates}</span>{" "}
                      <span className="text-muted-foreground">services</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{type._count.partTemplates}</span>{" "}
                      <span className="text-muted-foreground">parts</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/admin/equipment-types/${type.id}`)}
                  >
                    <Settings className="mr-2 h-3 w-3" />
                    Manage Templates
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(type)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDeleteDialog(type)}
                    disabled={type._count.equipmentInstances > 0}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Equipment Type" : "Create Equipment Type"}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? "Update the equipment type details"
                : "Add a new equipment type to the catalog"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingType && (
              <div className="space-y-2">
                <Label htmlFor="categoryId">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Type Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Commercial Oven"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this equipment type"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Common Brands</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Rational, Unox, Lincoln"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of common brands
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avgLifespanMonths">Average Lifespan (months)</Label>
                <Input
                  id="avgLifespanMonths"
                  type="number"
                  value={formData.avgLifespanMonths}
                  onChange={(e) =>
                    setFormData({ ...formData, avgLifespanMonths: e.target.value })
                  }
                  placeholder="180"
                  min={1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avgWarrantyMonths">Average Warranty (months)</Label>
                <Input
                  id="avgWarrantyMonths"
                  type="number"
                  value={formData.avgWarrantyMonths}
                  onChange={(e) =>
                    setFormData({ ...formData, avgWarrantyMonths: e.target.value })
                  }
                  placeholder="12"
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingType ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingType?.name}" and all its service
              and part templates. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
