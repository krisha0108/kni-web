"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: {
    subCategories: number;
    products: number;
    vendorCategories: number;
  };
}

export default function AdminMarketplaceCategoriesPage() {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);

  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("includeInactive", "true");
      params.set("page", String(page));
      params.set("pageSize", "20");

      const response = await fetch("/api/admin/marketplace/categories?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setCategories(items);
        setTotalPages(Math.ceil(total / 20) || 1);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search, page]);

  const resetForm = () => {
    setFormName("");
    setFormImageUrl("");
    setFormIsActive(true);
    setFormSortOrder(0);
  };

  const handleCreate = async () => {
    if (!formName) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/marketplace/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          imageUrl: formImageUrl || undefined,
          isActive: formIsActive,
          sortOrder: formSortOrder,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Category created successfully" });
        setIsCreateOpen(false);
        resetForm();
        fetchCategories();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory) return;
    if (!formName) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/marketplace/categories/" + selectedCategory.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          imageUrl: formImageUrl || null,
          isActive: formIsActive,
          sortOrder: formSortOrder,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Category updated successfully" });
        setIsEditOpen(false);
        setSelectedCategory(null);
        resetForm();
        fetchCategories();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      const response = await fetch("/api/admin/marketplace/categories/" + selectedCategory.id, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Category deleted successfully" });
        setIsDeleteOpen(false);
        setSelectedCategory(null);
        fetchCategories();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    }
  };

  const openEditDialog = (category: MarketplaceCategory) => {
    setSelectedCategory(category);
    setFormName(category.name);
    setFormImageUrl(category.imageUrl || "");
    setFormIsActive(category.isActive);
    setFormSortOrder(category.sortOrder);
    setIsEditOpen(true);
  };

  return (
    <ClientOnly>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Marketplace Categories</h1>
          <p className="text-muted-foreground">
            Manage product categories for the marketplace
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>
                Add a new category to the marketplace
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Vegetables, Dairy, Spices"
                />
              </div>
              <div className="space-y-2">
                <Label>Category Image</Label>
                <ImageUpload
                  value={formImageUrl}
                  onChange={(url) => setFormImageUrl(url)}
                  folder="marketplace-categories"
                  label="Upload Category Image"
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
                {isSaving ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Subcategories</TableHead>
              
              <TableHead>Products</TableHead>
              <TableHead>Vendors</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort Order</TableHead>
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
            ) : categories.length === 0 ? (
              
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {category.imageUrl ? (
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-xs text-muted-foreground">{category.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>{category._count.subCategories}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{category._count.products}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>{category._count.vendorCategories}</TableCell>
                  <TableCell>
                    <Badge variant={category.isActive ? "success" : "secondary"}>
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>{category.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCategory(category);
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
          setSelectedCategory(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name *</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category Image</Label>
              <ImageUpload
                value={formImageUrl}
                onChange={(url) => setFormImageUrl(url)}
                folder="marketplace-categories"
                label="Upload Category Image"
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
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"?
              {selectedCategory && (selectedCategory._count.products > 0 || selectedCategory._count.subCategories > 0) && (
                <span className="block mt-2 text-red-600">
                  This category has {selectedCategory._count.products} product(s) and {selectedCategory._count.subCategories} subcategory(ies).
                  You must remove them first before deleting.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={selectedCategory ? (selectedCategory._count.products > 0 || selectedCategory._count.subCategories > 0) : false}
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