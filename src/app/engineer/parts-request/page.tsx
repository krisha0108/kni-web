/**
 * ============================================================================
 * SERVICE ENGINEER PARTS REQUEST PAGE (WEB)
 * ============================================================================
 *
 * PARTS REQUEST FLOW - SERVICE ENGINEER WEB ROLE:
 * ------------------------------------------------
 * This page allows service engineers to:
 * 1. Create new part requests for their service jobs
 * 2. View status of all their requests
 * 3. Cancel pending requests
 * 4. Confirm delivery of dispatched parts
 *
 * FLOW DIAGRAM (Engineer's Perspective):
 *
 *   [Engineer creates request] --> [PENDING] ---> [Can CANCEL]
 *                                      |
 *                              [Admin processes]
 *                                      |
 *                    +-----------------+-----------------+
 *                    |                                   |
 *               [APPROVED]                          [REJECTED]
 *                    |                             (View reason)
 *                    |
 *             [Admin dispatches]
 *                    |
 *                    v
 *              [DISPATCHED] ---> [CONFIRM DELIVERY]
 *                                       |
 *                                       v
 *                                  [DELIVERED]
 *
 * API ENDPOINTS USED:
 * - GET  /api/engineer-app/part-requests              - Fetch engineer's requests
 * - POST /api/engineer-app/part-requests              - Create new request
 * - POST /api/engineer-app/part-requests/[id]/cancel  - Cancel pending request
 * - POST /api/engineer-app/part-requests/[id]/delivered - Confirm delivery
 * - GET  /api/service-engineer/parts                  - Fetch available parts list
 *
 * ENGINEER ACTIONS:
 * 1. CREATE REQUEST - Submit new part request with:
 *    - part_id (required): Which part to request
 *    - quantity (default: 1): How many units needed
 *    - priority (low/medium/high/urgent): Request urgency
 *    - reason (optional): Why the part is needed
 *
 * 2. CANCEL REQUEST - Only for PENDING status
 *    - Changes status to CANCELLED
 *    - Records cancelledAt timestamp
 *
 * 3. CONFIRM DELIVERY - Only for DISPATCHED status
 *    - Changes status to DELIVERED
 *    - Records deliveredAt timestamp
 *    - Part is now in engineer's inventory
 *
 * ============================================================================
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  Search,
  AlertCircle,
  Calendar,
  Hash,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PartRequest {
  id: string;
  part_id: string;
  part_name: string;
  part_description: string | null;
  part_price: number;
  part_category: string;
  quantity: number;
  priority: "low" | "medium" | "high" | "urgent";
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "dispatched" | "delivered" | "cancelled";
  admin_note: string | null;
  rejection_reason: string | null;
  assignment_id: string | null;
  job_restaurant: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Part {
  id: string;
  title: string;  // API returns 'title' not 'name'
  name?: string;
  description: string | null;
  price: number;
  stock_quantity: number;  // API returns snake_case
  stockQuantity?: number;
  category?: string;  // API returns category name as string
  category_id?: string;
  sku?: string;
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

const priorityConfig = {
  low: { label: "Low", color: "bg-green-100 text-green-800" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  high: { label: "High", color: "bg-orange-100 text-orange-800" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-800" },
};

const statusConfig = {
  pending: { label: "Pending", color: "warning", icon: Clock },
  approved: { label: "Approved", color: "success", icon: CheckCircle },
  rejected: { label: "Rejected", color: "destructive", icon: XCircle },
  dispatched: { label: "Dispatched", color: "default", icon: Truck },
  delivered: { label: "Delivered", color: "success", icon: PackageCheck },
  cancelled: { label: "Cancelled", color: "secondary", icon: XCircle },
};

/**
 * Parts Request Page Component (Service Engineer Web)
 *
 * State Management:
 * - requests: Engineer's part requests (filtered by status)
 * - parts: Available parts catalog for creating new requests
 * - summary: Count statistics for each status
 * - form: New request form state (part_id, quantity, priority, reason)
 * - mounted: Hydration-safe flag (prevents SSR/client mismatch)
 */
export default function PartsRequestPage() {
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
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
  const [activeTab, setActiveTab] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PartRequest | null>(null);
  const { toast } = useToast();

  // Form state for creating new part request
  const [form, setForm] = useState({
    part_id: "",
    quantity: "1",
    priority: "medium",
    reason: "",
  });

  // Handle hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchRequests();
      fetchParts();
    }
  }, [activeTab, mounted]);

  /**
   * Fetch engineer's part requests
   *
   * API: GET /api/engineer-app/part-requests?status={status}
   *
   * Returns only requests belonging to the logged-in engineer.
   * Includes part details, status, timestamps, and any admin notes/rejection reasons.
   */
  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.set("status", activeTab);
      }

      const response = await fetch(`/api/engineer-app/part-requests?${params}`);
      const data = await response.json();

      if (data.ok) {
        setRequests(data.data || []);
        setSummary(data.summary || {});
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch requests",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await fetch("/api/service-engineer/parts");
      const data = await response.json();

      if (data.ok || Array.isArray(data.data)) {
        setParts(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch parts:", error);
    }
  };

  /**
   * Submit new part request
   *
   * API: POST /api/engineer-app/part-requests
   *
   * Request Body:
   * - part_id: ID of the part to request (required)
   * - quantity: Number of units needed (default: 1)
   * - priority: "low" | "medium" | "high" | "urgent"
   * - reason: Optional text explaining why part is needed
   *
   * Creates a new request with status PENDING.
   * Admin will be notified and can approve/reject from admin panel.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.part_id) {
      toast({
        title: "Error",
        description: "Please select a part",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/engineer-app/part-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_id: form.part_id,
          quantity: parseInt(form.quantity) || 1,
          priority: form.priority,
          reason: form.reason || null,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Part request submitted successfully",
        });
        setIsDialogOpen(false);
        resetForm();
        fetchRequests();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Cancel a pending part request
   *
   * API: POST /api/engineer-app/part-requests/{id}/cancel
   *
   * Only allowed for requests with status PENDING.
   * Changes status to CANCELLED and records cancelledAt timestamp.
   * Request cannot be recovered after cancellation.
   */
  const handleCancel = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(`/api/engineer-app/part-requests/${selectedRequest.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by engineer" }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Request cancelled",
        });
        setCancelDialogOpen(false);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to cancel request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive",
      });
    }
  };

  /**
   * Confirm delivery of a dispatched part
   *
   * API: POST /api/engineer-app/part-requests/{id}/delivered
   *
   * Only allowed for requests with status DISPATCHED.
   * Changes status to DELIVERED and records deliveredAt timestamp.
   *
   * After confirmation:
   * - Part is added to engineer's inventory (parts-inventory API)
   * - Request flow is complete
   */
  const handleConfirmDelivery = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(`/api/engineer-app/part-requests/${selectedRequest.id}/delivered`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Delivery confirmed",
        });
        setDeliverDialogOpen(false);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to confirm delivery",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm delivery",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setForm({
      part_id: "",
      quantity: "1",
      priority: "medium",
      reason: "",
    });
  };

  const filteredParts = parts.filter(
    (part) => {
      const partName = part.title || part.name || "";
      const partCategory = typeof part.category === "string" ? part.category : "";
      return (
        partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partCategory.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  );

  const RequestCard = ({ request }: { request: PartRequest }) => {
    const status = statusConfig[request.status];
    const priority = priorityConfig[request.priority];
    const StatusIcon = status.icon;

    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{request.part_name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{request.part_category}</p>
            </div>
            <Badge variant={status.color as any}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <p className="text-muted-foreground">Quantity</p>
              <p className="font-medium">{request.quantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Priority</p>
              <Badge variant="outline" className={priority.color}>
                {priority.label}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Requested</p>
              <p className="font-medium">{formatDate(request.created_at)}</p>
            </div>
            {request.job_restaurant && (
              <div>
                <p className="text-muted-foreground">Restaurant</p>
                <p className="font-medium">{request.job_restaurant}</p>
              </div>
            )}
          </div>

          {request.reason && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Reason</p>
              <p className="text-sm">{request.reason}</p>
            </div>
          )}

          {request.rejection_reason && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm font-medium text-red-800">Rejection Reason</p>
              <p className="text-sm text-red-700">{request.rejection_reason}</p>
            </div>
          )}

          {request.admin_note && (
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm font-medium text-blue-800">Admin Note</p>
              <p className="text-sm text-blue-700">{request.admin_note}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {request.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  setSelectedRequest(request);
                  setCancelDialogOpen(true);
                }}
              >
                Cancel Request
              </Button>
            )}
            {request.status === "dispatched" && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setSelectedRequest(request);
                  setDeliverDialogOpen(true);
                }}
              >
                <PackageCheck className="h-4 w-4 mr-1" />
                Confirm Delivery
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Parts Request</h1>
          <p className="text-muted-foreground">Request parts for your service jobs</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{summary.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{summary.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{summary.dispatched}</p>
                <p className="text-xs text-muted-foreground">Dispatched</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{summary.delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{summary.rejected + summary.cancelled}</p>
                <p className="text-xs text-muted-foreground">Rejected/Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - only render after mount to prevent hydration mismatch */}
      {mounted ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({summary.total})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({summary.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({summary.approved})</TabsTrigger>
            <TabsTrigger value="dispatched">Dispatched ({summary.dispatched})</TabsTrigger>
            <TabsTrigger value="delivered">Delivered ({summary.delivered})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Part Requests</h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === "all"
                      ? "You haven't made any part requests yet"
                      : `No ${activeTab} requests`}
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      )}

      {/* New Request Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Part</DialogTitle>
            <DialogDescription>
              Submit a request for parts needed for your service jobs
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="part">
                  Select Part <span className="text-red-500">*</span>
                </Label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search parts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {filteredParts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No parts found</p>
                  ) : (
                    filteredParts.slice(0, 10).map((part) => (
                      <div
                        key={part.id}
                        className={`p-3 cursor-pointer border-b last:border-0 hover:bg-muted/50 transition-colors ${
                          form.part_id === part.id ? "bg-primary/10 border-primary" : ""
                        }`}
                        onClick={() => setForm({ ...form, part_id: part.id })}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{part.title || part.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {typeof part.category === "string" ? part.category : "Uncategorized"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              Stock: {part.stock_quantity ?? part.stockQuantity ?? 0}
                            </p>
                            {form.part_id === part.id && (
                              <CheckCircle className="h-4 w-4 text-green-500 inline" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(value) => setForm({ ...form, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason / Notes</Label>
                <Textarea
                  id="reason"
                  placeholder="Why do you need this part?"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !form.part_id}>
                {isSaving ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the request for{" "}
              <strong>{selectedRequest?.part_name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
              Yes, cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delivery Dialog */}
      <AlertDialog open={deliverDialogOpen} onOpenChange={setDeliverDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Have you received <strong>{selectedRequest?.quantity}x {selectedRequest?.part_name}</strong>?
              Please confirm only after you have physically received the parts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelivery} className="bg-green-600 hover:bg-green-700">
              <PackageCheck className="h-4 w-4 mr-1" />
              Yes, I received it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
