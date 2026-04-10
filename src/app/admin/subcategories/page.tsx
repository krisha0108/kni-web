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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, FolderOpen } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import Image from "next/image";

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  category: Category;
}

export default function AdminSubCategoriesPage() {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    imageUrl: "",
  });
  const { toast } = useToast();

  const fetchCategories = async () => {
    const response = await fetch("/api/admin/categories");
    const data = await response.json();
    if (data.ok) setCategories(data.data.items);
  };

  const fetchSubCategories = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCategoryId && filterCategoryId !== "all") params.set("categoryId", filterCategoryId);
      params.set("page", page.toString());
      params.set("pageSize", "20");
      const response = await fetch("/api/admin/subcategories?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setSubCategories(Array.isArray(items) ? items : []);
        setTotalPages(Math.ceil(total / 20) || 1);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch subcategories", variant: "destructive" });
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
    setFormData({ name: "", categoryId: "", imageUrl: "" });
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/admin/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Subcategory created" });
        setIsCreateOpen(false);
        resetForm();
        fetchSubCategories();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create subcategory", variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    if (!selectedSubCategory) return;
    try {
      const response = await fetch("/api/admin/subcategories/" + selectedSubCategory.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Subcategory updated" });
        setIsEditOpen(false);
        setSelectedSubCategory(null);
        resetForm();
        fetchSubCategories();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update subcategory", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedSubCategory) return;
    try {
      const response = await fetch("/api/admin/subcategories/" + selectedSubCategory.id, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Subcategory deleted" });
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

  const openEditDialog = (subCategory: SubCategory) => {
    setSelectedSubCategory(subCategory);
    setFormData({
      name: subCategory.name,
      categoryId: subCategory.category.id,
      imageUrl: subCategory.imageUrl || "",
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Subcategories</h1>
          <p className="text-muted-foreground">Manage subcategories</p>
        </div>
        <ClientOnly>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Subcategory</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Subcategory</DialogTitle>
                <DialogDescription>Add a new subcategory</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <ImageUpload
                    value={formData.imageUrl}
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                    folder="subcategories"
                    label="Upload Subcategory Image"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ClientOnly>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search subcategories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <ClientOnly>
          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 sm:px-4">Name</TableHead>
                <TableHead className="px-2 sm:px-4">Category</TableHead>
                <TableHead className="px-2 sm:px-4">Status</TableHead>
                <TableHead className="px-2 sm:px-4">Created</TableHead>
                <TableHead className="px-2 sm:px-4 w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : subCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No subcategories found</TableCell>
                </TableRow>
              ) : (
                subCategories.map((subCategory) => (
                  <TableRow key={subCategory.id}>
                    <TableCell className="font-medium px-2 sm:px-4">
                      <div className="flex items-center gap-2">
                        {subCategory.imageUrl ? (
                          <Image
                            src={subCategory.imageUrl}
                            alt={subCategory.name}
                            width={32}
                            height={32}
                            className="rounded-md object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-xs sm:text-sm">{subCategory.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 sm:px-4 text-xs sm:text-sm">
                      {subCategory.category.name}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <Badge variant={subCategory.isActive ? "success" : "secondary"} className="text-xs whitespace-nowrap">
                        {subCategory.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 sm:px-4 text-xs sm:text-sm">
                      {formatDate(subCategory.createdAt)}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditDialog(subCategory)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setSelectedSubCategory(subCategory); setIsDeleteOpen(true); }}
                          className="h-8 w-8"
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
      </div>

      <ClientOnly>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Subcategory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                  folder="subcategories"
                  label="Upload Subcategory Image"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ClientOnly>

      <ClientOnly>
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{selectedSubCategory?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </ClientOnly>
    </div>
  );
}