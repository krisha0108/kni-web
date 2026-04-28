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
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type Tone = "OK" | "INFO" | "WARN" | "DANGER";

interface Feed {
  id: string;
  text: string;
  tone: Tone;
  icon: string | null;
  linkUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TONE_OPTIONS: Tone[] = ["OK", "INFO", "WARN", "DANGER"];

function ToneBadge({ tone }: { tone: Tone }) {
  switch (tone) {
    case "OK":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
          OK
        </Badge>
      );
    case "INFO":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
          INFO
        </Badge>
      );
    case "WARN":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
          WARN
        </Badge>
      );
    case "DANGER":
      return <Badge variant="destructive">DANGER</Badge>;
    default:
      return <Badge variant="secondary">{tone}</Badge>;
  }
}

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);

  const [formData, setFormData] = useState({
    text: "",
    tone: "INFO" as Tone,
    icon: "",
    linkUrl: "",
    isActive: true,
  });

  const { toast } = useToast();

  const fetchFeeds = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (activeFilter === "active") params.set("isActive", "true");
      if (activeFilter === "inactive") params.set("isActive", "false");

      const response = await fetch(`/api/admin/feeds?${params}`);
      const data = await response.json();
      if (data.ok) {
        setFeeds(data.data?.items || data.data || []);
        setTotal(data.data?.total || 0);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch feeds",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [activeFilter]);

  useEffect(() => {
    fetchFeeds();
  }, [activeFilter, page]);

  const handleCreate = async () => {
    if (!formData.text.trim() || formData.text.trim().length < 3) {
      toast({
        title: "Error",
        description: "Feed text is required (min 3 characters)",
        variant: "destructive",
      });
      return;
    }
    try {
      const payload = {
        text: formData.text,
        tone: formData.tone,
        icon: formData.icon || undefined,
        linkUrl: formData.linkUrl || undefined,
        isActive: formData.isActive,
      };
      const response = await fetch("/api/admin/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Feed created successfully" });
        setIsCreateOpen(false);
        resetForm();
        fetchFeeds();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create feed", variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    if (!selectedFeed) return;
    if (!formData.text.trim() || formData.text.trim().length < 3) {
      toast({
        title: "Error",
        description: "Feed text is required (min 3 characters)",
        variant: "destructive",
      });
      return;
    }
    try {
      const payload = {
        text: formData.text,
        tone: formData.tone,
        icon: formData.icon || undefined,
        linkUrl: formData.linkUrl || undefined,
        isActive: formData.isActive,
      };
      const response = await fetch(`/api/admin/feeds/${selectedFeed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Feed updated successfully" });
        setIsEditOpen(false);
        resetForm();
        fetchFeeds();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update feed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedFeed) return;
    try {
      const response = await fetch(`/api/admin/feeds/${selectedFeed.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Feed deleted successfully" });
        setIsDeleteOpen(false);
        setSelectedFeed(null);
        fetchFeeds();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete feed", variant: "destructive" });
    }
  };

  const handleToggleActive = async (feed: Feed) => {
    try {
      const response = await fetch(`/api/admin/feeds/${feed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !feed.isActive }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: `Feed ${!feed.isActive ? "activated" : "deactivated"} successfully`,
        });
        fetchFeeds();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update feed", variant: "destructive" });
    }
  };

  const openEditDialog = (feed: Feed) => {
    setSelectedFeed(feed);
    setFormData({
      text: feed.text,
      tone: feed.tone,
      icon: feed.icon || "",
      linkUrl: feed.linkUrl || "",
      isActive: feed.isActive,
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (feed: Feed) => {
    setSelectedFeed(feed);
    setIsDeleteOpen(true);
  };

  const resetForm = () => {
    setFormData({
      text: "",
      tone: "INFO",
      icon: "",
      linkUrl: "",
      isActive: true,
    });
    setSelectedFeed(null);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Feeds Management</h1>
          <p className="text-muted-foreground">Manage feed items displayed across the app</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Feed
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Text</TableHead>
              <TableHead>Tone</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : feeds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No feeds found. Create your first feed!
                </TableCell>
              </TableRow>
            ) : (
              feeds.map((feed) => (
                <TableRow key={feed.id}>
                  <TableCell>
                    <div className="max-w-[300px] truncate font-medium">{feed.text}</div>
                  </TableCell>
                  <TableCell>
                    <ToneBadge tone={feed.tone} />
                  </TableCell>
                  <TableCell>
                    {feed.icon ? (
                      <span className="text-sm font-mono">{feed.icon}</span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {feed.linkUrl ? (
                      <a
                        href={feed.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:underline text-sm"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Link
                      </a>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(feed)}
                      title={feed.isActive ? "Deactivate" : "Activate"}
                    >
                      {feed.isActive ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>{formatDate(feed.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(feed)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(feed)}
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
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
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
            <DialogTitle>{isEditOpen ? "Edit Feed" : "Create New Feed"}</DialogTitle>
            <DialogDescription>
              {isEditOpen ? "Update feed details" : "Add a new feed item"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="text">Text *</Label>
              <Textarea
                id="text"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Feed text (min 3 characters)"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tone">Tone</Label>
                <Select
                  value={formData.tone}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tone: value as Tone })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="icon">Icon (optional)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g. bell, info, alert"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="linkUrl">Link URL (optional)</Label>
              <Input
                id="linkUrl"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked === true })
                }
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
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
              {isEditOpen ? "Update Feed" : "Create Feed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feed?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feed? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
