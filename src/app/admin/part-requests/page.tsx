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
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Package,
  Truck,
  AlertTriangle,
  Clock,
  Building2,
  Hash,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PartRequest {
  id: string;
  quantity: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
  adminNote?: string;
  rejectionReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  createdAt: string;
  partItem: {
    id: string;
    name: string;
    description?: string;
    price: number;
    category?: {
      id: string;
      name: string;
    };
    inventory?: {
      currentStock: number;
    };
  };
  engineer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  assignment?: {
    id: string;
    bookingId: string;
    booking: {
      id: string;
      restaurant: {
        id: string;
        name: string;
        address: string;
      };
    };
  };
  admin?: {
    id: string;
    name: string;
  };
}

interface Summary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  dispatched: number;
  delivered: number;
  cancelled: number;
}

export default function AdminPartRequestsPage() {
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    dispatched: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PartRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const fetchRequests = async (status?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (status && status !== "all") {
        params.append("status", status);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const url = `/api/admin/part-requests?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        setRequests(data.data);
        setSummary(data.summary);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load part requests", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(activeTab);
  }, [activeTab]);

  const handleAction = async (requestId: string, action: "approve" | "reject" | "dispatch") => {
    if (action === "reject" && !rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a rejection reason", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/part-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminNote: adminNote || undefined,
          rejectionReason: action === "reject" ? rejectionReason : undefined,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        const actionLabels = {
          approve: "approved",
          reject: "rejected",
          dispatch: "dispatched",
        };
        toast({ title: "Success", description: `Part request ${actionLabels[action]} successfully` });
        setIsRejectDialogOpen(false);
        setRejectionReason("");
        setAdminNote("");
        setSelectedRequest(null);
        fetchRequests(activeTab);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: `Failed to ${action} request`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-500">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "DISPATCHED":
        return <Badge className="bg-purple-500">Dispatched</Badge>;
      case "DELIVERED":
        return <Badge variant="success">Delivered</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive">Urgent</Badge>;
      case "HIGH":
        return <Badge className="bg-orange-500">High</Badge>;
      case "MEDIUM":
        return <Badge variant="warning">Medium</Badge>;
      case "LOW":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  const formatPrice = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const renderRequest = (request: PartRequest) => (
    <Card key={request.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-semibold">{request.partItem.name}</h3>
              {getStatusBadge(request.status)}
              {getPriorityBadge(request.priority)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>
                    <strong>Engineer:</strong> {request.engineer.name}
                    {request.engineer.phone && ` (${request.engineer.phone})`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  <span>
                    <strong>Quantity:</strong> {request.quantity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span>
                    <strong>Price:</strong> {formatPrice(request.partItem.price)} each
                  </span>
                </div>
                {request.partItem.inventory && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      <strong>Stock:</strong> {request.partItem.inventory.currentStock} available
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                {request.assignment && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>
                      <strong>Job:</strong> {request.assignment.booking.restaurant.name}
                    </span>
                  </div>
                )}
                {request.partItem.category && (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>
                      <strong>Category:</strong> {request.partItem.category.name}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    <strong>Requested:</strong> {formatDate(request.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {request.reason && (
              <div className="mt-3 p-3 bg-muted rounded-md">
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

            {request.adminNote && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <p className="text-sm font-medium mb-1 text-blue-700">Admin Note:</p>
                <p className="text-sm text-blue-600">{request.adminNote}</p>
              </div>
            )}

            {/* Status timeline */}
            {(request.approvedAt || request.dispatchedAt || request.deliveredAt) && (
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {request.approvedAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Approved: {formatDate(request.approvedAt)}
                  </div>
                )}
                {request.dispatchedAt && (
                  <div className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Dispatched: {formatDate(request.dispatchedAt)}
                  </div>
                )}
                {request.deliveredAt && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Delivered: {formatDate(request.deliveredAt)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {request.status === "PENDING" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleAction(request.id, "approve")}
                  disabled={isProcessing}
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
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {request.status === "APPROVED" && (
              <Button
                size="sm"
                className="bg-purple-500 hover:bg-purple-600"
                onClick={() => handleAction(request.id, "dispatch")}
                disabled={isProcessing}
              >
                <Truck className="h-4 w-4 mr-1" />
                Dispatch
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Part Requests</h1>
        <p className="text-muted-foreground">
          Review and manage part requests from service engineers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
            <p className="text-xs text-yellow-600">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.approved}</p>
            <p className="text-xs text-blue-600">Approved</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{summary.dispatched}</p>
            <p className="text-xs text-purple-600">Dispatched</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.delivered}</p>
            <p className="text-xs text-green-600">Delivered</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
            <p className="text-xs text-red-600">Rejected</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{summary.cancelled}</p>
            <p className="text-xs text-gray-600">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search by part name, engineer name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button onClick={() => fetchRequests(activeTab)}>Search</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} id="part-requests-tabs">
        <TabsList>
          <TabsTrigger value="pending">Pending ({summary.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({summary.approved})</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched ({summary.dispatched})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({summary.delivered})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({summary.rejected})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading part requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No part requests found</p>
              </CardContent>
            </Card>
          ) : (
            <div>{requests.map(renderRequest)}</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Part Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this part request. The engineer will be
              notified.
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
            <div className="space-y-2">
              <Label htmlFor="adminNote">Admin Note (Optional)</Label>
              <Textarea
                id="adminNote"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add any additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
                setAdminNote("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleAction(selectedRequest.id, "reject")}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
