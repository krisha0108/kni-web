"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { getAMCDurationLabel } from "@/lib/amc";
import { formatPrice } from "@/lib/utils";

interface AMCPlan {
  id: string;
  name: string;
  description: string | null;
  duration: "MONTHLY" | "QUARTERLY" | "YEARLY";
  price: number;
  serviceLimit: number;
  featuresJson: string[] | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminAMCPlansPage() {
  const [plans, setPlans] = useState<AMCPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AMCPlan | null>(null);
  const [search, setSearch] = useState("");
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "MONTHLY" as "MONTHLY" | "QUARTERLY" | "YEARLY",
    price: "",
    serviceLimit: "",
    features: "",
    isActive: true,
  });

  useEffect(() => {
    fetchPlans();
  }, [search, durationFilter]);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (durationFilter !== "all") params.append("duration", durationFilter);

      const response = await fetch("/api/admin/amc-plans?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setPlans(data.data.plans || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch AMC plans",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      duration: "MONTHLY",
      price: "",
      serviceLimit: "",
      features: "",
      isActive: true,
    });
  };

  const handleCreate = async () => {
    try {
      if (!formData.name || !formData.price || !formData.serviceLimit) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const features = formData.features
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        duration: formData.duration,
        price: Math.round(parseFloat(formData.price) * 100), // Convert to paise
        serviceLimit: parseInt(formData.serviceLimit, 10),
        featuresJson: features.length > 0 ? features : undefined,
        isActive: formData.isActive,
      };

      const response = await fetch("/api/admin/amc-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "AMC plan created successfully",
        });
        setIsCreateOpen(false);
        resetForm();
        fetchPlans();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create AMC plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create AMC plan",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!editingPlan) return;

    try {
      const features = formData.features
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const payload: any = {};
      if (formData.name !== editingPlan.name) payload.name = formData.name;
      if (formData.description !== (editingPlan.description || "")) payload.description = formData.description;
      if (formData.duration !== editingPlan.duration) payload.duration = formData.duration;
      if (formData.price) {
        const priceInPaise = Math.round(parseFloat(formData.price) * 100);
        if (priceInPaise !== editingPlan.price) payload.price = priceInPaise;
      }
      if (formData.serviceLimit) {
        const limit = parseInt(formData.serviceLimit, 10);
        if (limit !== editingPlan.serviceLimit) payload.serviceLimit = limit;
      }
      if (features.length > 0) payload.featuresJson = features;
      if (formData.isActive !== editingPlan.isActive) payload.isActive = formData.isActive;

      const response = await fetch(`/api/admin/amc-plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "AMC plan updated successfully",
        });
        setIsEditOpen(false);
        setEditingPlan(null);
        resetForm();
        fetchPlans();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update AMC plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AMC plan",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this AMC plan?")) return;

    try {
      const response = await fetch(`/api/admin/amc-plans/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "AMC plan deleted successfully",
        });
        fetchPlans();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete AMC plan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete AMC plan",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (plan: AMCPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      duration: plan.duration,
      price: (plan.price / 100).toFixed(2),
      serviceLimit: plan.serviceLimit.toString(),
      features: plan.featuresJson && Array.isArray(plan.featuresJson) ? plan.featuresJson.join("\n") : "",
      isActive: plan.isActive,
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AMC Plans</h1>
          <p className="text-muted-foreground">Manage Annual Maintenance Contract plans</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create AMC Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Plan Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Basic Monthly AMC"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this plan includes"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Duration *</Label>
                <ClientOnly>
                  <Select value={formData.duration} onValueChange={(v: any) => setFormData({ ...formData, duration: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly (3 months)</SelectItem>
                      <SelectItem value="YEARLY">Yearly (12 months)</SelectItem>
                    </SelectContent>
                  </Select>
                </ClientOnly>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="1999.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Service Limit *</Label>
                  <Input
                    type="number"
                    value={formData.serviceLimit}
                    onChange={(e) => setFormData({ ...formData, serviceLimit: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="Priority support&#10;Free parts replacement&#10;24/7 helpline"
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive" className="cursor-pointer">Active (visible to customers)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ClientOnly>
          <Select value={durationFilter} onValueChange={setDurationFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Durations</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="QUARTERLY">Quarterly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Service Limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No AMC plans found. Create your first plan to get started.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{getAMCDurationLabel(plan.duration)}</TableCell>
                  <TableCell>{formatPrice(plan.price)}</TableCell>
                  <TableCell>{plan.serviceLimit} services</TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? "success" : "secondary"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(plan)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(plan.id)}
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit AMC Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration *</Label>
              <ClientOnly>
                <Select value={formData.duration} onValueChange={(v: any) => setFormData({ ...formData, duration: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly (3 months)</SelectItem>
                    <SelectItem value="YEARLY">Yearly (12 months)</SelectItem>
                  </SelectContent>
                </Select>
              </ClientOnly>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Service Limit *</Label>
                <Input
                  type="number"
                  value={formData.serviceLimit}
                  onChange={(e) => setFormData({ ...formData, serviceLimit: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActiveEdit"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActiveEdit" className="cursor-pointer">Active (visible to customers)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Update Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
