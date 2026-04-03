"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  Loader2,
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  ImageIcon,
} from "lucide-react";

interface Collection {
  id: string;
  totalAmount: number;
  status: string;
  screenshotUrl: string | null;
  rejectionReason: string | null;
  paymentMethod?: string;
  razorpayPaymentId?: string;
  paymentUploadedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

interface CommissionVendor {
  vendor: {
    id: string;
    name: string;
    email: string;
  };
  commissionRate: number | null;
  totalCommission: number;
  pendingCommission: number;
  collections: Collection[];
}

interface FlatCollection extends Collection {
  vendorName: string;
}

const collectionStatusColors: Record<
  string,
  "default" | "secondary" | "success" | "destructive" | "warning"
> = {
  REQUESTED: "warning",
  PAYMENT_UPLOADED: "secondary",
  PAYMENT_REJECTED: "destructive",
  VERIFIED: "success",
};

export default function AdminVendorCommissionsPage() {
  const [vendors, setVendors] = useState<CommissionVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [collectingVendorId, setCollectingVendorId] = useState<string | null>(
    null
  );
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [isScreenshotDialogOpen, setIsScreenshotDialogOpen] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", "20");
      const response = await fetch("/api/admin/vendor-commissions?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || data.total || 0;
        const pSize = data.data?.pageSize || 20;
        setVendors(Array.isArray(items) ? items : []);
        setTotalPages(data.totalPages || Math.ceil(total / pSize) || 1);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch commission data",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch commission data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const allCollections = useMemo<FlatCollection[]>(() => {
    return vendors
      .flatMap((vendor) =>
        vendor.collections.map((c) => ({ ...c, vendorName: vendor.vendor.name }))
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [vendors]);

  const handleCollect = async (vendorId: string) => {
    try {
      setCollectingVendorId(vendorId);
      const response = await fetch("/api/admin/vendor-commissions/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Commission collection requested",
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to collect commission",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to collect commission",
        variant: "destructive",
      });
    } finally {
      setCollectingVendorId(null);
    }
  };

  const handleVerify = async (collectionId: string) => {
    try {
      setVerifyingId(collectionId);
      const response = await fetch(
        `/api/admin/vendor-commissions/${collectionId}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Payment verified successfully",
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to verify payment",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to verify payment",
        variant: "destructive",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const openRejectDialog = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setIsRejectDialogOpen(true);
    setRejectionReason("");
    setRejectionError("");
  };

  const handleReject = async () => {
    if (!selectedCollectionId) return;

    if (!rejectionReason || rejectionReason.trim().length < 10) {
      setRejectionError("Rejection reason must be at least 10 characters");
      return;
    }

    setIsRejecting(true);
    setRejectionError("");

    try {
      const response = await fetch(
        `/api/admin/vendor-commissions/${selectedCollectionId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
        }
      );
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Payment rejected",
        });
        setIsRejectDialogOpen(false);
        setSelectedCollectionId(null);
        setRejectionReason("");
        fetchData();
      } else {
        setRejectionError(data.error || "Failed to reject payment");
      }
    } catch {
      setRejectionError("Failed to reject payment");
    } finally {
      setIsRejecting(false);
    }
  };

  const openScreenshotDialog = (url: string) => {
    setScreenshotUrl(url);
    setIsScreenshotDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
          Vendor Commissions
        </h1>
        <p className="text-muted-foreground">
          Manage vendor commission collections
        </p>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Summary</CardTitle>
          <CardDescription>
            Overview of vendor commission rates and balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Total Commission</TableHead>
                  <TableHead>Pending Commission</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : vendors.length === 0 ? (
                  
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No vendors with commissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  vendors.map((vendor) => (
                    
                    <TableRow key={vendor.vendor.id}>
                      <TableCell className="font-medium">
                        {vendor.vendor.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {vendor.vendor.email}
                      </TableCell>
                      
                      <TableCell>
                        {vendor.commissionRate ?? 0}%
                      </TableCell>
                      <TableCell>
                        {formatPrice(vendor.totalCommission)}
                      </TableCell>
                      
                      <TableCell>
                        <span
                          className={
                            vendor.pendingCommission > 0
                              ? "font-semibold text-orange-600"
                              : ""
                          }
                        >
                          {formatPrice(vendor.pendingCommission)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={
                            vendor.pendingCommission <= 0 ||
                            collectingVendorId === vendor.vendor.id
                          }
                          onClick={() => handleCollect(vendor.vendor.id)}
                        >
                          {collectingVendorId === vendor.vendor.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <DollarSign className="h-4 w-4 mr-1" />
                          )}
                          Collect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
        </CardContent>
      </Card>

      {/* Collections Section */}
      <Card>
        <CardHeader>
          <CardTitle>Collections</CardTitle>
          <CardDescription>
            All commission collection records across vendors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Amount</TableHead>
                  
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : allCollections.length === 0 ? (
                  
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No collections found
                    </TableCell>
                  </TableRow>
                ) : (
                  allCollections.map((collection) => (
                    
                    <TableRow key={collection.id}>
                      <TableCell className="font-medium">
                        {collection.vendorName}
                      </TableCell>
                      <TableCell>{formatPrice(collection.totalAmount)}</TableCell>
                      
                      <TableCell>
                        <Badge
                          variant={
                            collectionStatusColors[collection.status] ||
                            "default"
                          }
                        >
                          {collection.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="hidden sm:table-cell">
                        {formatDate(collection.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* Razorpay auto-verified */}
                          {collection.status === "VERIFIED" && collection.paymentMethod === "RAZORPAY" && (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                              Razorpay
                            </Badge>
                          )}
                          {/* Manual screenshot — show verify/reject */}
                          {collection.status === "PAYMENT_UPLOADED" && (
                            <>
                              {collection.screenshotUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    openScreenshotDialog(
                                      collection.screenshotUrl!
                                    )
                                  }
                                  title="View Screenshot"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Screenshot
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleVerify(collection.id)}
                                disabled={verifyingId === collection.id}
                                title="Verify Payment"
                              >
                                {verifyingId === collection.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openRejectDialog(collection.id)}
                                title="Reject Payment"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {collection.status === "PAYMENT_REJECTED" &&
                            collection.rejectionReason && (
                              <span
                                className="text-sm text-destructive truncate max-w-[180px]"
                                title={collection.rejectionReason}
                              >
                                {collection.rejectionReason}
                              </span>
                            )}
                          {collection.status === "VERIFIED" &&
                            collection.verifiedAt && (
                              <span className="text-sm text-muted-foreground">
                                Verified {formatDate(collection.verifiedAt)}
                              </span>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
                      
                      
                    
                  
              
                  
            
          </div>
        </CardContent>
      </Card>

      {/* Screenshot Dialog */}
      <Dialog
        open={isScreenshotDialogOpen}
        onOpenChange={setIsScreenshotDialogOpen}
      >
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
            <DialogDescription>
              Review the uploaded payment proof
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            {screenshotUrl ? (
              <img
                src={screenshotUrl}
                alt="Payment screenshot"
                className="max-w-full max-h-[60vh] rounded-lg border object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
                <ImageIcon className="h-12 w-12" />
                <p>No screenshot available</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsScreenshotDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment. This will be
              sent to the vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              placeholder="Enter the reason for rejection (minimum 10 characters)..."
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setRejectionError("");
              }}
              rows={4}
            />
            {rejectionError && (
              <p className="text-sm text-destructive">{rejectionError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setSelectedCollectionId(null);
                setRejectionReason("");
                setRejectionError("");
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || rejectionReason.trim().length < 10}
            >
              {isRejecting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}