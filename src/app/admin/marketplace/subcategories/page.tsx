"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, FolderOpen, Package } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { ClientOnly } from "@/components/client-only";

interface MarketplaceCategory {
  id: string;
  name: string;
}

interface MarketplaceSubCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  category: MarketplaceCategory;
  _count: {
    products: number;
  };
}

export default function AdminMarketplaceSubCategoriesPage() {
  const [subCategories, setSubCategories] = useState<MarketplaceSubCategory[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState<MarketplaceSubCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);

  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/marketplace/categories");
      const data = await response.json();
      if (data.ok) {
        setCategories(data.data?.items || data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const fetchSubCategories = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCategoryId && filterCategoryId !== "all") params.set("categoryId", filterCategoryId);
      params.set("includeInactive", "true");
      params.set("page", String(page));
      params.set("pageSize", "20");

      const response = await fetch("/api/admin/marketplace/subcategories?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setSubCategories(items);
        setTotalPages(Math.ceil(total / 20) || 1);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch subcategories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchSubCategories();
  }, [search, filterCategoryId, page]);

  const resetForm = () => {
    setFormName("");
    setFormCategoryId("");
    setFormImageUrl("");
    setFormIsActive(true);
    setFormSortOrder(0);
  };

  const handleCreate = async () => {
    if (!formName || !formCategoryId) {
      toast({ title: "Error", description: "Name and Category are required", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/marketplace/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          categoryId: formCategoryId,
          imageUrl: formImageUrl || undefined,
          isActive: formIsActive,
          sortOrder: formSortOrder,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Subcategory created successfully" });
        setIsCreateOpen(false);
        resetForm();
        fetchSubCategories();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create subcategory", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedSubCategory) return;
    if (!formName || !formCategoryId) {
      toast({ title: "Error", description: "Name and Category are required", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/marketplace/subcategories/" + selectedSubCategory.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          categoryId: formCategoryId,
          imageUrl: formImageUrl || null,
          isActive: formIsActive,
          sortOrder: formSortOrder,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Subcategory updated successfully" });
        setIsEditOpen(false);
        setSelectedSubCategory(null);
        resetForm();
        fetchSubCategories();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update subcategory", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSubCategory) return;
    try {
      const response = await fetch("/api/admin/marketplace/subcategories/" + selectedSubCategory.id, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Subcategory deleted successfully" });
        setIsDeleteOpen(false);
        setSelectedSubCategory(null);
        fetchSubCategories();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete subcategory", variant: "destructive" });
    }
  };

  const openEditDialog = (subCategory: MarketplaceSubCategory) => {
    setSelectedSubCategory(subCategory);
    setFormName(subCategory.name);
    setFormCategoryId(subCategory.category.id);
    setFormImageUrl(subCategory.imageUrl || "");
    setFormIsActive(subCategory.isActive);
    setFormSortOrder(subCategory.sortOrder);
    setIsEditOpen(true);
  };

  return (
    <ClientOnly>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Marketplace Subcategories</h1>
          <p className="text-muted-foreground">
            Manage product subcategories for the marketplace
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Subcategory
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Subcategory</DialogTitle>
              <DialogDescription>
                Add a new subcategory to a marketplace category
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Parent Category *</Label>
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Subcategory Name *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Leafy Vegetables, Milk Products"
                />
              </div>
              <div className="space-y-2">
                <Label>Subcategory Image</Label>
                <ImageUpload
                  value={formImageUrl}
                  onChange={(url) => setFormImageUrl(url)}
                  folder="marketplace-subcategories"
                  label="Upload Subcategory Image"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive">Active (visible in marketplace)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Subcategory"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subcategories..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Select value={filterCategoryId} onValueChange={(v) => { setFilterCategoryId(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subcategory</TableHead>
              <TableHead>Category</TableHead>
              
              <TableHead>Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : subCategories.length === 0 ? (
              
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No subcategories found
                </TableCell>
              </TableRow>
            ) : (
              subCategories.map((subCategory) => (
                
                <TableRow key={subCategory.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {subCategory.imageUrl ? (
                        <img
                          src={subCategory.imageUrl}
                          alt={subCategory.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{subCategory.name}</div>
                        <div className="text-xs text-muted-foreground">{subCategory.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline">{subCategory.category.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{subCategory._count.products}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={subCategory.isActive ? "success" : "secondary"}>
                      {subCategory.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>{subCategory.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(subCategory)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSubCategory(subCategory);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setSelectedSubCategory(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
            <DialogDescription>Update subcategory details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-categoryId">Parent Category *</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Subcategory Name *</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subcategory Image</Label>
              <ImageUpload
                value={formImageUrl}
                onChange={(url) => setFormImageUrl(url)}
                folder="marketplace-subcategories"
                label="Upload Subcategory Image"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sortOrder">Sort Order</Label>
              <Input
                id="edit-sortOrder"
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-isActive">Active (visible in marketplace)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSubCategory?.name}"?
              {selectedSubCategory && selectedSubCategory._count.products > 0 && (
                <span className="block mt-2 text-red-600">
                  This subcategory has {selectedSubCategory._count.products} product(s).
                  You must remove them first before deleting.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={selectedSubCategory ? selectedSubCategory._count.products > 0 : false}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </ClientOnly>
  );
}