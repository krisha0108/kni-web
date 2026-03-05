"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FolderOpen,
  Plus,
  Tag,
  FileText,
  MessageSquare,
  Send,
  Calendar,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRestaurant } from "@/contexts/restaurant-context";

interface CategoryRequest {
  id: string;
  requestedName: string;
  description?: string;
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  createdAt: string;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

export default function OwnerCategoryRequestPage() {
  const [formData, setFormData] = useState({
    categoryName: "",
    description: "",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myRequests, setMyRequests] = useState<CategoryRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [deleteRequest, setDeleteRequest] = useState<CategoryRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { selectedRestaurant } = useRestaurant();

  const loadMyRequests = useCallback(async () => {
    if (!selectedRestaurant) return;
    try {
      const response = await fetch(`/api/owner/category-request?restaurantId=${selectedRestaurant.restaurantId}`);
      const data = await response.json();
      if (data.ok) {
        setMyRequests(data.data || []);
      }
    } catch (error) {
      console.error("Load requests error:", error);
    } finally {
      setLoadingRequests(false);
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    loadMyRequests();
  }, [loadMyRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/owner/category-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, restaurantId: selectedRestaurant?.restaurantId }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Request Submitted!",
          description: "Admin will review your category request soon."
        });
        setFormData({ categoryName: "", description: "", reason: "" });
        setIsModalOpen(false);
        loadMyRequests();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit category request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit category request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRequest) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/owner/category-request/${deleteRequest.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Deleted",
          description: "Request deleted successfully",
        });
        loadMyRequests();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete request",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteRequest(null);
    }
  };

  // Stats
  const pendingCount = myRequests.filter(r => r.status === "PENDING").length;
  const approvedCount = myRequests.filter(r => r.status === "APPROVED").length;
  const rejectedCount = myRequests.filter(r => r.status === "REJECTED").length;

  const canCreate = selectedRestaurant?.role === "OWNER" || selectedRestaurant?.role === "MANAGER";

  if (!selectedRestaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">Please select a restaurant first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Category Requests</h1>
            <p className="text-sm text-slate-500">Manage your category requests</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* New Request Button in Header */}
          {canCreate && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          )}
          <button
            onClick={() => {
              setLoadingRequests(true);
              loadMyRequests();
            }}
            disabled={loadingRequests}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 text-slate-700 ${loadingRequests ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-700">{pendingCount}</p>
              <p className="text-sm text-amber-600 font-medium">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-700">{approvedCount}</p>
              <p className="text-sm text-emerald-600 font-medium">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700">{rejectedCount}</p>
              <p className="text-sm text-red-600 font-medium">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {loadingRequests ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
          </div>
          <p className="text-slate-500">Loading your requests...</p>
        </div>
      ) : myRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <FolderOpen className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No Requests Yet</h3>
          <p className="text-slate-500 text-center max-w-sm mb-4">
            Click "New Request" button to submit your first category request
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {myRequests.map((request) => (
            <div
              key={request.id}
              className={`bg-white rounded-2xl border-2 p-5 transition-all hover:shadow-lg ${
                request.status === "PENDING" ? "border-amber-200 hover:border-amber-300" :
                request.status === "APPROVED" ? "border-emerald-200 hover:border-emerald-300" :
                "border-red-200 hover:border-red-300"
              }`}
            >
              {/* Status Badge & Date */}
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  request.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                  request.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {request.status === "PENDING" && <Clock className="h-3.5 w-3.5" />}
                  {request.status === "APPROVED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {request.status === "REJECTED" && <XCircle className="h-3.5 w-3.5" />}
                  {request.status === "PENDING" ? "Pending" : request.status === "APPROVED" ? "Approved" : "Rejected"}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(request.createdAt)}
                </span>
              </div>

              {/* Category Name */}
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {request.requestedName}
              </h3>

              {/* Description */}
              {request.description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                  {request.description}
                </p>
              )}

              {/* Rejection Reason */}
              {request.status === "REJECTED" && request.rejectionReason && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-600 mb-0.5">Reason</p>
                      <p className="text-sm text-red-600">{request.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Button for Pending */}
              {request.status === "PENDING" && canCreate && (
                <button
                  onClick={() => setDeleteRequest(request)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-medium text-sm transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Request
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>New Category Request</DialogTitle>
                <DialogDescription>
                  Submit a request for a new category
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Category Name */}
            <div className="space-y-2">
              <Label htmlFor="categoryName" className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Category Name
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="categoryName"
                placeholder="e.g., Seafood, Vegan, Italian"
                value={formData.categoryName}
                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                className="h-11"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                Description
                <span className="text-xs text-slate-400 ml-auto">Optional</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what this category represents..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                Reason
                <span className="text-xs text-slate-400 ml-auto">Optional</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Why do you need this category?"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.categoryName.trim()}
                className="flex-1 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRequest} onOpenChange={() => setDeleteRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the request for "{deleteRequest?.requestedName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}