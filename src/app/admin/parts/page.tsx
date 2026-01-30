"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import Image from "next/image";

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
}

interface PartItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isActive: boolean;
  createdAt: string;
  category: Category;
  subCategory: SubCategory | null;
}

export default function AdminPartsPage() {
  const [parts, setParts] = useState<PartItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    categoryId: "",
    subCategoryId: "",
  });
  const { toast } = useToast();

  const fetchCategories = async () => {
    const response = await fetch("/api/admin/categories");
    const data = await response.json();
    if (data.ok) setCategories(data.data.items);
  };

  const fetchSubCategories = async (categoryId: string) => {
    const response = await fetch("/api/admin/subcategories?categoryId=" + categoryId);
    const data = await response.json();
    if (data.ok) setSubCategories(data.data.items);
  };

  const fetchParts = async () => {
    try {
      setIsLoading(true);
      let url = "/api/admin/parts?search=" + encodeURIComponent(search);
      if (filterCategoryId && filterCategoryId !== "all") url += "&categoryId=" + filterCategoryId;
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) setParts(data.data.items);
    } catch {
      toast({ title: "Error", description: "Failed to fetch parts", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchParts();
  }, [search, filterCategoryId]);

  useEffect(() => {
    if (formData.categoryId) {
      fetchSubCategories(formData.categoryId);
    } else {
      setSubCategories([]);
    }
  }, [formData.categoryId]);

  const resetForm = () => {
    setFormData({ name: "", description: "", imageUrl: "", price: "", categoryId: "", subCategoryId: "" });
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/admin/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price, 10),
          subCategoryId: formData.subCategoryId || undefined,
          imageUrl: formData.imageUrl || undefined,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Part created" });
        setIsCreateOpen(false);
        resetForm();
        fetchParts();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create part", variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    if (!selectedPart) return;
    try {
      const response = await fetch("/api/admin/parts/" + selectedPart.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price, 10),
          subCategoryId: formData.subCategoryId || undefined,
          imageUrl: formData.imageUrl || null,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Part updated" });
        setIsEditOpen(false);
        setSelectedPart(null);
        resetForm();
        fetchParts();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update part", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedPart) return;
    try {
      const response = await fetch("/api/admin/parts/" + selectedPart.id, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Part deleted" });
        setIsDeleteOpen(false);
        setSelectedPart(null);
        fetchParts();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete part", variant: "destructive" });
    }
  };

  const openEditDialog = (part: PartItem) => {
    setSelectedPart(part);
    setFormData({
      name: part.name,
      description: part.description || "",
      imageUrl: part.imageUrl || "",
      price: part.price.toString(),
      categoryId: part.category.id,
      subCategoryId: part.subCategory?.id || "",
    });
    fetchSubCategories(part.category.id);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Parts</h1>
          <p className="text-muted-foreground">Manage part items</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Part</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Part</DialogTitle>
              <DialogDescription>Add a new part to the catalog</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                  folder="parts"
                  label="Upload Part Image"
                />
              </div>
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="e.g., 1000" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <ClientOnly>
                  <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v, subCategoryId: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </ClientOnly>
              </div>
              {subCategories.length > 0 && (
                <div className="space-y-2">
                  <Label>Subcategory (optional)</Label>
                  <ClientOnly>
                    <Select value={formData.subCategoryId} onValueChange={(v) => setFormData({ ...formData, subCategoryId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                      <SelectContent>
                        {subCategories.map((sub) => (<SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </ClientOnly>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search parts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px] sm:w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : parts.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No parts found</TableCell></TableRow>
            ) : (
              parts.map((part) => (
                <TableRow key={part.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {part.imageUrl ? (
                        <Image
                          src={part.imageUrl}
                          alt={part.name}
                          width={40}
                          height={40}
                          className="rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{part.name}</div>
                        {part.description && <div className="text-sm text-muted-foreground line-clamp-1">{part.description}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div>{part.category.name}</div>
                    {part.subCategory && <div className="text-sm text-muted-foreground">{part.subCategory.name}</div>}
                  </TableCell>
                  <TableCell>{formatCurrency(part.price)}</TableCell>
                  <TableCell>
                    <Badge variant={part.isActive ? "success" : "secondary"}>{part.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(part)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedPart(part); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Part</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                folder="parts"
                label="Upload Part Image"
              />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Part</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{selectedPart?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
