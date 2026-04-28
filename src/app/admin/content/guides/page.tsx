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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";

interface Guide {
  id: string;
  thumbUrl: string;
  title: string;
  description: string | null;
  minutes: number;
  linkUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  title: string;
  description: string;
  thumbUrl: string;
  linkUrl: string;
  minutes: number;
  sortOrder: number;
  isActive: boolean;
}

const defaultFormData: FormData = {
  title: "",
  description: "",
  thumbUrl: "",
  linkUrl: "",
  minutes: 0,
  sortOrder: 0,
  isActive: true,
};

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...defaultFormData });

  const { toast } = useToast();

  const fetchGuides = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (activeFilter !== "all") {
        params.set("isActive", activeFilter);
      }
      const response = await fetch(`/api/admin/guides?${params.toString()}`);
      const data = await response.json();
      if (data.ok) {
        setGuides(data.data?.items || data.data || []);
        setTotal(data.data?.total || 0);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch guides",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, [activeFilter, page]);

  const handleCreate = async () => {
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      toast({ title: "Error", description: "Title must be at least 3 characters", variant: "destructive" });
      return;
    }
    if (!formData.thumbUrl.trim()) {
      toast({ title: "Error", description: "Thumbnail image is required", variant: "destructive" });
      return;
    }
    if (!formData.linkUrl.trim()) {
      toast({ title: "Error", description: "Link URL is required", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        thumbUrl: formData.thumbUrl.trim(),
        linkUrl: formData.linkUrl.trim(),
        minutes: formData.minutes,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
      };
      const response = await fetch("/api/admin/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Guide created successfully" });
        setIsCreateOpen(false);
        resetForm();
        fetchGuides();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create guide", variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    if (!selectedGuide) return;
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        thumbUrl: formData.thumbUrl.trim(),
        linkUrl: formData.linkUrl.trim(),
        minutes: formData.minutes,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
      };
      const response = await fetch(`/api/admin/guides/${selectedGuide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Guide updated successfully" });
        setIsEditOpen(false);
        resetForm();
        fetchGuides();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update guide", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedGuide) return;
    try {
      const response = await fetch(`/api/admin/guides/${selectedGuide.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Guide deleted successfully" });
        setIsDeleteOpen(false);
        setSelectedGuide(null);
        fetchGuides();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete guide", variant: "destructive" });
    }
  };

  const handleToggleActive = async (guide: Guide) => {
    try {
      const response = await fetch(`/api/admin/guides/${guide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !guide.isActive }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: `Guide ${!guide.isActive ? "activated" : "deactivated"} successfully`,
        });
        fetchGuides();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to toggle guide status", variant: "destructive" });
    }
  };

  const openEditDialog = (guide: Guide) => {
    setSelectedGuide(guide);
    setFormData({
      title: guide.title,
      description: guide.description || "",
      thumbUrl: guide.thumbUrl,
      linkUrl: guide.linkUrl,
      minutes: guide.minutes,
      sortOrder: guide.sortOrder,
      isActive: guide.isActive,
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (guide: Guide) => {
    setSelectedGuide(guide);
    setIsDeleteOpen(true);
  };

  const resetForm = () => {
    setFormData({ ...defaultFormData });
    setSelectedGuide(null);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Guides Management</h1>
          <p className="text-muted-foreground">Manage tutorial guides and video content</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Guide
        </Button>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
        <Select value={activeFilter} onValueChange={(value) => { setActiveFilter(value); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Guides</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground self-center">
          {total} guide{total !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Thumb</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="w-20">Duration</TableHead>
              <TableHead className="hidden sm:table-cell">Link</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-16">Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : guides.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No guides found. Add your first guide!
                </TableCell>
              </TableRow>
            ) : (
              guides.map((guide) => (
                <TableRow key={guide.id}>
                  <TableCell>
                    <img
                      src={guide.thumbUrl}
                      alt={guide.title}
                      className="h-10 w-14 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{guide.title}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="max-w-[250px] text-sm text-muted-foreground truncate">
                      {guide.description || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      {guide.minutes} min
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <a
                      href={guide.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline max-w-[200px] truncate"
                    >
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{guide.linkUrl}</span>
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={guide.isActive ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleActive(guide)}
                    >
                      {guide.isActive ? (
                        <><Eye className="h-3 w-3 mr-1" /> Active</>
                      ) : (
                        <><EyeOff className="h-3 w-3 mr-1" /> Inactive</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{guide.sortOrder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(guide)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(guide)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setIsEditOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Edit Guide" : "Add New Guide"}</DialogTitle>
            <DialogDescription>
              {isEditOpen ? "Update guide details" : "Add a new tutorial guide"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Guide title (min 3 characters)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the guide"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Thumbnail Image *</Label>
              <ImageUpload
                value={formData.thumbUrl}
                onChange={(url) => setFormData({ ...formData, thumbUrl: url })}
                folder="guides"
                label="Upload Thumbnail"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="linkUrl">Link URL *</Label>
              <Input
                id="linkUrl"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="minutes">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Duration (minutes)
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  min={0}
                  value={formData.minutes}
                  onChange={(e) => setFormData({ ...formData, minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min={0}
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked === true })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={isEditOpen ? handleEdit : handleCreate}>
              {isEditOpen ? "Update Guide" : "Add Guide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guide?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedGuide?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
