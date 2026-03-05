"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, User, Calendar, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CategoryRequest {
  id: string;
  requestedName: string;
  description?: string;
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  restaurant?: {
    id: string;
    name: string;
  };
}

export default function AdminCategoryRequestsPage() {
  const [requests, setRequests] = useState<CategoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CategoryRequest | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchRequests = async (status?: string) => {
    try {
      setIsLoading(true);
      const url = status
        ? `/api/admin/category-requests?status=${status}`
        : "/api/admin/category-requests";
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        setRequests(data.data);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load category requests", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const statusMap: { [key: string]: string } = {
      pending: "PENDING",
      approved: "APPROVED",
      rejected: "REJECTED",
      all: "",
    };
    fetchRequests(statusMap[activeTab]);
  }, [activeTab]);

  const handleApprove = async (requestId: string) => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/admin/category-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Category request approved and category created" });
        setSelectedRequest(null);
        fetchRequests(activeTab === "all" ? "" : activeTab.toUpperCase());
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve request", variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    if (!selectedRequest) return;

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/admin/category-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Category request rejected" });
        setIsRejectDialogOpen(false);
        setRejectionReason("");
        setSelectedRequest(null);
        fetchRequests(activeTab === "all" ? "" : activeTab.toUpperCase());
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject request", variant: "destructive" });
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderRequest = (request: CategoryRequest) => (
    <Card key={request.id} className="mb-3 sm:mb-4">
      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
        <div className="flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold line-clamp-2">{request.requestedName}</h3>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(request.status)}
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{request.owner.name} ({request.owner.email})</span>
            </div>
            {request.restaurant && (
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">{request.restaurant.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{formatDate(request.createdAt)}</span>
            </div>
          </div>

          {request.description && (
            <div className="mt-3 sm:mt-4">
              <p className="text-xs sm:text-sm font-medium mb-1">Description:</p>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{request.description}</p>
            </div>
          )}

          {request.reason && (
            <div className="mt-3 sm:mt-4">
              <p className="text-xs sm:text-sm font-medium mb-1">Reason:</p>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{request.reason}</p>
            </div>
          )}

          {request.status === "REJECTED" && request.rejectionReason && (
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-destructive/10 rounded-md">
              <p className="text-xs sm:text-sm font-medium mb-1 text-destructive">Rejection Reason:</p>
              <p className="text-xs sm:text-sm text-destructive line-clamp-3">{request.rejectionReason}</p>
            </div>
          )}

          {request.status === "PENDING" && (
            <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4 ml-0">
              <Button
                size="sm"
                onClick={() => handleApprove(request.id)}
                disabled={isApproving}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              >
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setSelectedRequest(request);
                  setIsRejectDialogOpen(true);
                }}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              >
                <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold">Category Requests</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Review and manage category requests from restaurant owners</p>
      </div>

      {isMounted && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 sm:mt-6">
            {isLoading ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-muted-foreground text-xs sm:text-sm">Loading category requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-12 text-center">
                  <p className="text-muted-foreground text-xs sm:text-sm">No category requests found</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {requests.map(renderRequest)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Reject Category Request</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Please provide a reason for rejecting this category request. The owner will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="rejectionReason" className="text-xs sm:text-sm">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={4}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
              }}
              disabled={isRejecting}
              size="sm"
              className="h-9 sm:h-10 text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason.trim()}
              size="sm"
              className="h-9 sm:h-10 text-xs sm:text-sm"
            >
              {isRejecting ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}