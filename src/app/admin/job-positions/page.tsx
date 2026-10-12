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
import { Plus, Pencil, Trash2, Search, Briefcase } from "lucide-react";
import { ClientOnly } from "@/components/client-only";

interface JobPosition {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  externalApplyUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { applications: number };
}

const emptyForm = {
  title: "",
  description: "",
  department: "",
  location: "",
  employmentType: "",
  externalApplyUrl: "",
  isActive: true,
  sortOrder: 0,
};

export default function AdminJobPositionsPage() {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { toast } = useToast();

  const fetchPositions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("includeInactive", "true");

      const response = await fetch("/api/admin/job-positions?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setPositions(data.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch job positions", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const resetForm = () => setForm(emptyForm);

  const handleCreate = async () => {
    if (!form.title) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/job-positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          department: form.department || undefined,
          location: form.location || undefined,
          employmentType: form.employmentType || undefined,
          externalApplyUrl: form.externalApplyUrl || undefined,
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Job position created" });
        setIsCreateOpen(false);
        resetForm();
        fetchPositions();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create job position", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedPosition) return;
    if (!form.title) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/job-positions/" + selectedPosition.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          department: form.department || null,
          location: form.location || null,
          employmentType: form.employmentType || null,
          externalApplyUrl: form.externalApplyUrl || null,
          isActive: form.isActive,
          sortOrder: form.sortOrder,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Job position updated" });
        setIsEditOpen(false);
        setSelectedPosition(null);
        resetForm();
        fetchPositions();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update job position", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPosition) return;
    try {
      const response = await fetch("/api/admin/job-positions/" + selectedPosition.id, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Job position deleted" });
        setIsDeleteOpen(false);
        setSelectedPosition(null);
        fetchPositions();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete job position", variant: "destructive" });
    }
  };

  const openEditDialog = (position: JobPosition) => {
    setSelectedPosition(position);
    setForm({
      title: position.title,
      description: position.description || "",
      department: position.department || "",
      location: position.location || "",
      employmentType: position.employmentType || "",
      externalApplyUrl: position.externalApplyUrl || "",
      isActive: position.isActive,
      sortOrder: position.sortOrder,
    });
    setIsEditOpen(true);
  };

  return (
    <ClientOnly>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Job Positions</h1>
            <p className="text-muted-foreground">
              Manage positions shown on the public Careers page
            </p>
          </div>
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Position
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Job Position</DialogTitle>
                <DialogDescription>Add a new position to the Careers page</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-title">Title *</Label>
                  <Input
                    id="create-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g., Sales Executive"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-description">Description</Label>
                  <Textarea
                    id="create-description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Short summary shown on the Careers page"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-department">Department</Label>
                    <Input
                      id="create-department"
                      value={form.department}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                      placeholder="e.g., Sales"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-location">Location</Label>
                    <Input
                      id="create-location"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="e.g., Ahmedabad"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-employmentType">Employment Type</Label>
                  <Input
                    id="create-employmentType"
                    value={form.employmentType}
                    onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
                    placeholder="e.g., Full-Time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-externalApplyUrl">External Apply URL (optional)</Label>
                  <Input
                    id="create-externalApplyUrl"
                    value={form.externalApplyUrl}
                    onChange={(e) => setForm((f) => ({ ...f, externalApplyUrl: e.target.value }))}
                    placeholder="Leave blank to use the simple popup form"
                  />
                  <p className="text-xs text-muted-foreground">
                    If set, Apply Now links here instead of opening the popup form (used for the existing Service Technician process via /apply).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-sortOrder">Sort Order</Label>
                  <Input
                    id="create-sortOrder"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="create-isActive">Active (visible on Careers page)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isSaving}>
                  {isSaving ? "Creating..." : "Create Position"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search positions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Department / Location</TableHead>
                <TableHead>Apply Flow</TableHead>
                <TableHead>Applications</TableHead>
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
              ) : positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Briefcase className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    No job positions found
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell>
                      <div className="font-medium">{position.title}</div>
                      <div className="text-xs text-muted-foreground">{position.slug}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[position.department, position.location].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell>
                      {position.externalApplyUrl ? (
                        <Badge variant="outline">External ({position.externalApplyUrl})</Badge>
                      ) : (
                        <Badge variant="outline">Popup form</Badge>
                      )}
                    </TableCell>
                    <TableCell>{position._count.applications}</TableCell>
                    <TableCell>
                      <Badge variant={position.isActive ? "success" : "secondary"}>
                        {position.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{position.sortOrder}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(position)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPosition(position);
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

        <Dialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) {
              setSelectedPosition(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Job Position</DialogTitle>
              <DialogDescription>Update position details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Sales Executive"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short summary shown on the Careers page"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Input
                    id="edit-department"
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    placeholder="e.g., Sales"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g., Ahmedabad"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-employmentType">Employment Type</Label>
                <Input
                  id="edit-employmentType"
                  value={form.employmentType}
                  onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
                  placeholder="e.g., Full-Time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-externalApplyUrl">External Apply URL (optional)</Label>
                <Input
                  id="edit-externalApplyUrl"
                  value={form.externalApplyUrl}
                  onChange={(e) => setForm((f) => ({ ...f, externalApplyUrl: e.target.value }))}
                  placeholder="Leave blank to use the simple popup form"
                />
                <p className="text-xs text-muted-foreground">
                  If set, Apply Now links here instead of opening the popup form (used for the existing Service Technician process via /apply).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sortOrder">Sort Order</Label>
                <Input
                  id="edit-sortOrder"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="edit-isActive">Active (visible on Careers page)</Label>
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

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Job Position</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{selectedPosition?.title}&quot;? It will be hidden from the
                Careers page. Any applications already received for it are kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ClientOnly>
  );
}
