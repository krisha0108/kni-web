"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { RejectionReasonInput } from "@/components/rejection-reason-input";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  Search,
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Clock,
  CreditCard,
} from "lucide-react";

interface SubscriptionRequest {
  id: string;
  vendorId: string;
  durationMonths: number;
  status: string;
  price: number | null;
  priceSentAt: string | null;
  screenshotUrl: string | null;
  paymentMethod?: string;
  razorpayPaymentId?: string;
  paymentUploadedAt: string | null;
  rejectionReason: string | null;
  adminNote: string | null;
  activatedAt: string | null;
  activeUntil: string | null;
  createdAt: string;
  vendor: { id: string; name: string; email: string; phone: string | null };
  priceSentBy: { id: string; name: string } | null;
  verifiedBy: { id: string; name: string } | null;
}

export default function AdminVendorSubscriptionsPage() {
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  // Set Price Dialog
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null);
  const [price, setPrice] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [isSettingPrice, setIsSettingPrice] = useState(false);

  // Screenshot Dialog
  const [isScreenshotDialogOpen, setIsScreenshotDialogOpen] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");

  // Reject Dialog
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Verify
  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("pageSize", "20");
      const res = await fetch(`/api/admin/vendor-subscriptions?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || data.total || 0;
        const pSize = data.data?.pageSize || 20;
        setRequests(Array.isArray(items) ? items : []);
        setTotalPages(data.totalPages || Math.ceil(total / pSize) || 1);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch requests", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, page]);

  const filteredRequests = requests.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.vendor.name.toLowerCase().includes(s) ||
      r.vendor.email.toLowerCase().includes(s)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return <Badge variant="warning">Requested</Badge>;
      case "PRICE_SENT":
        return <Badge variant="default">Price Sent</Badge>;
      case "PAYMENT_UPLOADED":
        return <Badge variant="secondary">Payment Uploaded</Badge>;
      case "PAYMENT_REJECTED":
        return <Badge variant="destructive">Payment Rejected</Badge>;
      case "ACTIVATED":
        return <Badge variant="success">Activated</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Set Price
  const openPriceDialog = (req: SubscriptionRequest) => {
    setSelectedRequest(req);
    setPrice("");
    setAdminNote("");
    setIsPriceDialogOpen(true);
  };

  const handleSetPrice = async () => {
    if (!selectedRequest || !price || Number(price) <= 0) {
      toast({ title: "Error", description: "Enter a valid price", variant: "destructive" });
      return;
    }
    setIsSettingPrice(true);
    try {
      const res = await fetch(`/api/admin/vendor-subscriptions/${selectedRequest.id}/set-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: Number(price), adminNote: adminNote || undefined }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Price sent to vendor" });
      setIsPriceDialogOpen(false);
      fetchRequests();
    } catch {
      toast({ title: "Error", description: "Failed to set price", variant: "destructive" });
    } finally {
      setIsSettingPrice(false);
    }
  };

  // View Screenshot
  const openScreenshotDialog = (url: string) => {
    setScreenshotUrl(url);
    setIsScreenshotDialogOpen(true);
  };

  // Verify
  const handleVerify = async (req: SubscriptionRequest) => {
    setIsVerifying(req.id);
    try {
      const res = await fetch(`/api/admin/vendor-subscriptions/${req.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!data.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Subscription activated!" });
      fetchRequests();
    } catch {
      toast({ title: "Error", description: "Failed to verify", variant: "destructive" });
    } finally {
      setIsVerifying(null);
    }
  };

  // Reject
  const openRejectDialog = (req: SubscriptionRequest) => {
    setSelectedRequest(req);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequest || rejectionReason.trim().length < 10) {
      toast({ title: "Error", description: "Rejection reason must be at least 10 characters", variant: "destructive" });
      return;
    }
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/admin/vendor-subscriptions/${selectedRequest.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Payment rejected" });
      setIsRejectDialogOpen(false);
      fetchRequests();
    } catch {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <ClientOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Subscription Requests</h1>
          <p className="text-muted-foreground">Manage vendor subscription requests and payments</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by vendor name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="REQUESTED">Requested</SelectItem>
              <SelectItem value="PRICE_SENT">Price Sent</SelectItem>
              <SelectItem value="PAYMENT_UPLOADED">Payment Uploaded</SelectItem>
              <SelectItem value="PAYMENT_REJECTED">Payment Rejected</SelectItem>
              <SelectItem value="ACTIVATED">Activated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No subscription requests found</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Duration</TableHead>
                  
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.vendor.name}</p>
                        <p className="text-sm text-muted-foreground">{req.vendor.email}</p>
                      </div>
                    </TableCell>
                    
                    <TableCell>{req.durationMonths} month(s)</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell>{req.price ? formatPrice(req.price) : "—"}</TableCell>
                    <TableCell>{formatDate(req.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* REQUESTED → Set Price */}
                        {req.status === "REQUESTED" && (
                          <Button size="sm" onClick={() => openPriceDialog(req)}>
                            <DollarSign className="mr-1 h-3.5 w-3.5" /> Set Price
                          </Button>
                        )}

                        {/* PRICE_SENT → Waiting */}
                        {req.status === "PRICE_SENT" && (
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" /> Waiting for payment
                          </Badge>
                        )}

                        {/* PAYMENT_UPLOADED → View + Verify + Reject (manual only) */}
                        {req.status === "PAYMENT_UPLOADED" && (
                          <>
                            {req.screenshotUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openScreenshotDialog(req.screenshotUrl!)}
                              >
                                <Eye className="mr-1 h-3.5 w-3.5" /> View
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleVerify(req)}
                              disabled={isVerifying === req.id}
                            >
                              {isVerifying === req.id ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              )}
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectDialog(req)}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}

                        {/* PAYMENT_REJECTED → Waiting */}
                        {req.status === "PAYMENT_REJECTED" && (
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" /> Waiting for retry
                          </Badge>
                        )}

                        {/* ACTIVATED → Show payment method + active until */}
                        {req.status === "ACTIVATED" && (
                          <div className="flex items-center gap-2">
                            {req.paymentMethod === "RAZORPAY" && (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                                Razorpay
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              Active until {req.activeUntil ? formatDate(req.activeUntil) : "—"}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4 p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Set Price Dialog */}
        <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
          <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Set Subscription Price</DialogTitle>
              <DialogDescription>
                {selectedRequest && (
                  <>
                    Set the price for {selectedRequest.vendor.name}&apos;s{" "}
                    {selectedRequest.durationMonths} month subscription request.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="price">
                  Price (Rs.) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter price in rupees"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="adminNote">Admin Note (Optional)</Label>
                <Textarea
                  id="adminNote"
                  placeholder="Any instructions or notes for the vendor..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPriceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSetPrice} disabled={isSettingPrice || !price}>
                {isSettingPrice ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" /> Send Price
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Screenshot Dialog */}
        <Dialog open={isScreenshotDialogOpen} onOpenChange={setIsScreenshotDialogOpen}>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payment Screenshot</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              {screenshotUrl && (
                <img
                  src={screenshotUrl}
                  alt="Payment Screenshot"
                  className="max-w-full max-h-[500px] rounded-lg object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reject Payment</DialogTitle>
              <DialogDescription>
                {selectedRequest && (
                  <>
                    Reject payment from {selectedRequest.vendor.name}. The vendor will be able to
                    re-upload a screenshot.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <RejectionReasonInput
              value={rejectionReason}
              onChange={setRejectionReason}
              category="PAYMENT_PROOF"
              label="Rejection Reason"
              placeholder="Enter reason for rejection (minimum 10 characters)"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isRejecting || rejectionReason.trim().length < 10}
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" /> Reject Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  );
}