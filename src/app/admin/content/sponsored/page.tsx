"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { StatCard } from "@/components/ui/stat-card";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Megaphone,
  BarChart3,
  MousePointerClick,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ContentType = "VENDOR" | "PRODUCT" | "SERVICE" | "GENERAL";

interface SponsoredContent {
  id: string;
  type: ContentType;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sponsoredBy: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  type: ContentType;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  sponsoredBy: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const EMPTY_FORM: FormData = {
  type: "GENERAL",
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  sponsoredBy: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

const TYPE_BADGE_CLASSES: Record<ContentType, string> = {
  VENDOR: "bg-purple-100 text-purple-800 border-purple-200",
  PRODUCT: "bg-blue-100 text-blue-800 border-blue-200",
  SERVICE: "bg-green-100 text-green-800 border-green-200",
  GENERAL: "bg-gray-100 text-gray-800 border-gray-200",
};

const PAGE_SIZE = 20;

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDateInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function computeCtr(clicks: number, impressions: number): string {
  if (!impressions) return "0.00%";
  return ((clicks / impressions) * 100).toFixed(2) + "%";
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SponsoredContentPage() {
  // Data
  const [items, setItems] = useState<SponsoredContent[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SponsoredContent | null>(null);

  // Form
  const [formData, setFormData] = useState<FormData>({ ...EMPTY_FORM });

  const { toast } = useToast();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (activeFilter !== "all") params.set("isActive", activeFilter);

      const res = await fetch(`/api/admin/sponsored-content?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setItems(json.data.items);
        setTotal(json.data.total);
      } else {
        toast({ title: "Error", description: json.error || "Failed to fetch campaigns", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch campaigns", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter, activeFilter, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, activeFilter]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalCampaigns = total;
  const activeCampaigns = items.filter((i) => i.isActive).length;
  const totalImpressions = items.reduce((sum, i) => sum + i.impressions, 0);
  const totalClicks = items.reduce((sum, i) => sum + i.clicks, 0);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const resetForm = () => setFormData({ ...EMPTY_FORM });

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (item: SponsoredContent) => {
    setSelectedItem(item);
    setFormData({
      type: item.type,
      title: item.title,
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      linkUrl: item.linkUrl || "",
      sponsoredBy: item.sponsoredBy,
      startDate: toDateInputValue(item.startDate),
      endDate: toDateInputValue(item.endDate),
      isActive: item.isActive,
    });
    setIsEditOpen(true);
  };

  const openDelete = (item: SponsoredContent) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.title || formData.title.length < 3) {
      toast({ title: "Validation", description: "Title must be at least 3 characters", variant: "destructive" });
      return;
    }
    if (!formData.sponsoredBy || formData.sponsoredBy.length < 2) {
      toast({ title: "Validation", description: "Sponsor name must be at least 2 characters", variant: "destructive" });
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast({ title: "Validation", description: "Start and end dates are required", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/admin/sponsored-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "Success", description: "Campaign created successfully" });
        setIsCreateOpen(false);
        resetForm();
        fetchItems();
      } else {
        toast({ title: "Error", description: json.error || "Failed to create campaign", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create campaign", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    if (!formData.title || formData.title.length < 3) {
      toast({ title: "Validation", description: "Title must be at least 3 characters", variant: "destructive" });
      return;
    }
    if (!formData.sponsoredBy || formData.sponsoredBy.length < 2) {
      toast({ title: "Validation", description: "Sponsor name must be at least 2 characters", variant: "destructive" });
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast({ title: "Validation", description: "Start and end dates are required", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/sponsored-content/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "Success", description: "Campaign updated successfully" });
        setIsEditOpen(false);
        setSelectedItem(null);
        resetForm();
        fetchItems();
      } else {
        toast({ title: "Error", description: json.error || "Failed to update campaign", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update campaign", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/sponsored-content/${selectedItem.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "Success", description: "Campaign deleted successfully" });
        setIsDeleteOpen(false);
        setSelectedItem(null);
        fetchItems();
      } else {
        toast({ title: "Error", description: json.error || "Failed to delete campaign", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete campaign", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (item: SponsoredContent) => {
    try {
      const res = await fetch(`/api/admin/sponsored-content/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const json = await res.json();
      if (json.ok) {
        toast({
          title: "Success",
          description: `Campaign ${item.isActive ? "deactivated" : "activated"} successfully`,
        });
        fetchItems();
      } else {
        toast({ title: "Error", description: json.error || "Failed to toggle status", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to toggle status", variant: "destructive" });
    }
  };

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Form fields (shared between create & edit) ─────────────────────────────

  const renderFormFields = () => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="type">Type</Label>
        <Select value={formData.type} onValueChange={(v) => setFormData((f) => ({ ...f, type: v as ContentType }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GENERAL">General</SelectItem>
            <SelectItem value="VENDOR">Vendor</SelectItem>
            <SelectItem value="PRODUCT">Product</SelectItem>
            <SelectItem value="SERVICE">Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
          placeholder="Campaign title"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
          placeholder="Campaign description (optional)"
          rows={3}
        />
      </div>

      <div className="grid gap-2">
        <Label>Campaign Image</Label>
        <ImageUpload
          value={formData.imageUrl}
          onChange={(url) => setFormData((f) => ({ ...f, imageUrl: url }))}
          folder="sponsored-content"
          label="Upload Campaign Image"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="linkUrl">Link URL</Label>
        <Input
          id="linkUrl"
          value={formData.linkUrl}
          onChange={(e) => setFormData((f) => ({ ...f, linkUrl: e.target.value }))}
          placeholder="https://example.com (optional)"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sponsoredBy">Sponsored By *</Label>
        <Input
          id="sponsoredBy"
          value={formData.sponsoredBy}
          onChange={(e) => setFormData((f) => ({ ...f, sponsoredBy: e.target.value }))}
          placeholder="Sponsor name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData((f) => ({ ...f, startDate: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData((f) => ({ ...f, endDate: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData((f) => ({ ...f, isActive: !!checked }))}
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Active
        </Label>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sponsored Content</h1>
          <p className="text-muted-foreground">Manage sponsored campaigns and promotions</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Campaigns" value={totalCampaigns} icon={Megaphone} />
        <StatCard title="Active" value={activeCampaigns} icon={TrendingUp} />
        <StatCard title="Total Impressions" value={totalImpressions.toLocaleString("en-IN")} icon={BarChart3} />
        <StatCard title="Total Clicks" value={totalClicks.toLocaleString("en-IN")} icon={MousePointerClick} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="VENDOR">Vendor</SelectItem>
            <SelectItem value="PRODUCT">Product</SelectItem>
            <SelectItem value="SERVICE">Service</SelectItem>
            <SelectItem value="GENERAL">General</SelectItem>
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sponsored By</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading campaigns...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  No sponsored campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TYPE_BADGE_CLASSES[item.type]}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.sponsoredBy}</TableCell>
                  <TableCell>{formatDate(item.startDate)}</TableCell>
                  <TableCell>{formatDate(item.endDate)}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.impressions.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right">{item.clicks.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right">{computeCtr(item.clicks, item.impressions)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(item)}
                        title={item.isActive ? "Deactivate" : "Activate"}
                      >
                        {item.isActive ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDelete(item)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} campaigns
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>Add a new sponsored content campaign.</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update the sponsored content campaign details.</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{selectedItem?.title}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-red-600 hover:bg-red-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
