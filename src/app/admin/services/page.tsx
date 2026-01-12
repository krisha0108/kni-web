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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  createdAt: string;
  category: Category;
  subCategory: SubCategory | null;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
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

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      let url = "/api/admin/services?search=" + encodeURIComponent(search);
      if (filterCategoryId && filterCategoryId !== "all") url += "&categoryId=" + filterCategoryId;
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) setServices(data.data.items);
    } catch {
      toast({ title: "Error", description: "Failed to fetch services", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [search, filterCategoryId]);

  useEffect(() => {
    if (formData.categoryId) {
      fetchSubCategories(formData.categoryId);
    } else {
      setSubCategories([]);
    }
  }, [formData.categoryId]);

  const resetForm = () => {
    setFormData({ name: "", description: "", price: "", categoryId: "", subCategoryId: "" });
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price, 10),
          subCategoryId: formData.subCategoryId || undefined,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Service created" });
        setIsCreateOpen(false);
        resetForm();
        fetchServices();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create service", variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    if (!selectedService) return;
    try {
      const response = await fetch("/api/admin/services/" + selectedService.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price, 10),
          subCategoryId: formData.subCategoryId || undefined,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Service updated" });
        setIsEditOpen(false);
        setSelectedService(null);
        resetForm();
        fetchServices();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update service", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedService) return;
    try {
      const response = await fetch("/api/admin/services/" + selectedService.id, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Service deleted" });
        setIsDeleteOpen(false);
        setSelectedService(null);
        fetchServices();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete service", variant: "destructive" });
    }
  };

  const openEditDialog = (service: ServiceItem) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price.toString(),
      categoryId: service.category.id,
      subCategoryId: service.subCategory?.id || "",
    });
    fetchSubCategories(service.category.id);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground">Manage service items</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Service</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Service</DialogTitle>
              <DialogDescription>Add a new service to the catalog</DialogDescription>
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
                <Label>Price (in paise)</Label>
                <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="100000 = Rs.1000" />
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <ClientOnly>
          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All categories" /></SelectTrigger>
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
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : services.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No services found</TableCell></TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="font-medium">{service.name}</div>
                    {service.description && <div className="text-sm text-muted-foreground">{service.description}</div>}
                  </TableCell>
                  <TableCell>
                    <div>{service.category.name}</div>
                    {service.subCategory && <div className="text-sm text-muted-foreground">{service.subCategory.name}</div>}
                  </TableCell>
                  <TableCell>{formatCurrency(service.price)}</TableCell>
                  <TableCell>
                    <Badge variant={service.isActive ? "success" : "secondary"}>{service.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(service)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedService(service); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
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
              <Label>Price (in paise)</Label>
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
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{selectedService?.name}"?</AlertDialogDescription>
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
