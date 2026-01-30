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
  const { toast } = useToast();

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
    <Card key={request.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">{request.requestedName}</h3>
              {getStatusBadge(request.status)}
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{request.owner.name} ({request.owner.email})</span>
              </div>
              {request.restaurant && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{request.restaurant.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(request.createdAt)}</span>
              </div>
            </div>

            {request.description && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Description:</p>
                <p className="text-sm text-muted-foreground">{request.description}</p>
              </div>
            )}

            {request.reason && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground">{request.reason}</p>
              </div>
            )}

            {request.status === "REJECTED" && request.rejectionReason && (
              <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                <p className="text-sm font-medium mb-1 text-destructive">Rejection Reason:</p>
                <p className="text-sm text-destructive">{request.rejectionReason}</p>
              </div>
            )}
          </div>

          {request.status === "PENDING" && (
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                onClick={() => handleApprove(request.id)}
                disabled={isApproving}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setSelectedRequest(request);
                  setIsRejectDialogOpen(true);
                }}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Category Requests</h1>
        <p className="text-muted-foreground">Review and manage category requests from restaurant owners</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading category requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No category requests found</p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {requests.map(renderRequest)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Category Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this category request. The owner will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
