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
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle, XCircle, Eye, MapPin, Tags, ShieldBan } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RejectionReasonInput } from "@/components/rejection-reason-input";
import Link from "next/link";

interface VendorCategory {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  vendorProfile: {
    approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
    subscriptionStatus: "TRIAL" | "ACTIVE" | "EXPIRED" | "BLOCKED" | null;
    approvalNote: string | null;
    city: string | null;
    state: string | null;
    trialEndsAt: string | null;
    activeUntil: string | null;
  } | null;
  categories: VendorCategory[];
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [pendingSubRequests, setPendingSubRequests] = useState(0);
  const { toast } = useToast();

  // Fetch pending subscription request count
  useEffect(() => {
    fetch("/api/admin/vendor-subscriptions?status=REQUESTED")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setPendingSubRequests(data.data.length);
      })
      .catch(() => {});
  }, []);

  const openDetailDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailDialogOpen(true);
  };

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch("/api/admin/vendors?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setVendors(data.data.items || data.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch vendors", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [search, statusFilter]);

  const handleApprove = async (vendorId: string) => {
    try {
      const response = await fetch("/api/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, action: "approve" }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Vendor approved" });
        fetchVendors();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to approve vendor", variant: "destructive" });
    }
  };

  const openRejectDialog = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setIsRejectDialogOpen(true);
    setRejectionReason("");
    setRejectionError("");
  };

  const handleReject = async () => {
    if (!selectedVendorId) return;

    // Validate rejection reason
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      setRejectionError("Rejection reason must be at least 10 characters");
      return;
    }

    setIsRejecting(true);
    setRejectionError("");

    try {
      const response = await fetch("/api/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: selectedVendorId,
          action: "reject",
          rejectionReason: rejectionReason.trim(),
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Vendor rejected successfully" });
        setIsRejectDialogOpen(false);
        setSelectedVendorId(null);
        setRejectionReason("");
        fetchVendors();
      } else {
        setRejectionError(data.error || "Failed to reject vendor");
      }
    } catch {
      setRejectionError("Failed to reject vendor");
    } finally {
      setIsRejecting(false);
    }
  };

  const statusColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "destructive",
  };

  const subscriptionColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
    TRIAL: "secondary",
    ACTIVE: "success",
    EXPIRED: "destructive",
    BLOCKED: "destructive",
    INACTIVE: "warning",
  };

  const handleBlock = async (vendorId: string) => {
    try {
      const response = await fetch("/api/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, action: "block" }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Vendor blocked" });
        fetchVendors();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to block vendor", variant: "destructive" });
    }
  };

  const getSubscriptionLabel = (vendor: Vendor) => {
    const profile = vendor.vendorProfile;
    if (!profile) return "N/A";
    const status = profile.subscriptionStatus;
    if (status === "TRIAL" && profile.trialEndsAt) {
      const days = Math.ceil((new Date(profile.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days <= 0) return "TRIAL EXPIRED";
      return `TRIAL (${days}d left)`;
    }
    if (status === "ACTIVE" && profile.activeUntil) {
      const days = Math.ceil((new Date(profile.activeUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days <= 0) return "EXPIRED";
      return `ACTIVE (${days}d left)`;
    }
    return status || "INACTIVE";
  };

  const isSubscriptionExpired = (vendor: Vendor) => {
    const profile = vendor.vendorProfile;
    if (!profile) return true;
    const status = profile.subscriptionStatus;
    if (status === "TRIAL" && profile.trialEndsAt) {
      return new Date(profile.trialEndsAt).getTime() < Date.now();
    }
    if (status === "ACTIVE" && profile.activeUntil) {
      return new Date(profile.activeUntil).getTime() < Date.now();
    }
    if (status === "BLOCKED" || status === "EXPIRED") return true;
    if (!status) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground">Manage vendor accounts and approvals</p>
        </div>
        {pendingSubRequests > 0 && (
          <Link href="/admin/vendor-subscriptions">
            <Badge variant="warning" className="cursor-pointer">
              {pendingSubRequests} Pending Subscription Request{pendingSubRequests > 1 ? "s" : ""}
            </Badge>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <ClientOnly>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden lg:table-cell">Categories</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Subscription</TableHead>
              <TableHead className="hidden lg:table-cell">Registered</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{vendor.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {vendor.vendorProfile?.city && vendor.vendorProfile?.state ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{vendor.vendorProfile.city}, {vendor.vendorProfile.state}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not set</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {vendor.categories && vendor.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {vendor.categories.slice(0, 2).map((cat) => (
                          <Badge key={cat.id} variant="outline" className="text-xs">
                            {cat.name}
                          </Badge>
                        ))}
                        {vendor.categories.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{vendor.categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[vendor.vendorProfile?.approvalStatus || "PENDING"] || "default"}>
                      {vendor.vendorProfile?.approvalStatus || "PENDING"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={isSubscriptionExpired(vendor) ? "destructive" : subscriptionColors[vendor.vendorProfile?.subscriptionStatus || "INACTIVE"] || "default"}>
                      {getSubscriptionLabel(vendor)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{formatDate(vendor.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDetailDialog(vendor)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {vendor.vendorProfile?.approvalStatus !== "APPROVED" ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(vendor.id)}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openRejectDialog(vendor.id)}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {vendor.vendorProfile?.subscriptionStatus !== "BLOCKED" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleBlock(vendor.id)}
                              title="Block Vendor"
                            >
                              <ShieldBan className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vendor Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
            <DialogDescription>
              Review vendor information for approval decision
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Business Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedVendor.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedVendor.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedVendor.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Registered</p>
                    <p className="font-medium">{formatDate(selectedVendor.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{selectedVendor.vendorProfile?.city || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">State</p>
                    <p className="font-medium">{selectedVendor.vendorProfile?.state || "Not set"}</p>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Tags className="h-3 w-3" /> Selected Categories
                </h4>
                {selectedVendor.categories && selectedVendor.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.categories.map((cat) => (
                      <Badge key={cat.id} variant="secondary">
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No categories selected</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Status</h4>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Approval</p>
                    <Badge variant={statusColors[selectedVendor.vendorProfile?.approvalStatus || "PENDING"] || "default"}>
                      {selectedVendor.vendorProfile?.approvalStatus || "PENDING"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subscription</p>
                    <Badge variant={isSubscriptionExpired(selectedVendor) ? "destructive" : subscriptionColors[selectedVendor.vendorProfile?.subscriptionStatus || "INACTIVE"] || "default"}>
                      {getSubscriptionLabel(selectedVendor)}
                    </Badge>
                  </div>
                </div>
                {selectedVendor.vendorProfile?.trialEndsAt && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Trial Ends</p>
                    <p className="font-medium text-sm">{formatDate(selectedVendor.vendorProfile.trialEndsAt)}</p>
                  </div>
                )}
                {selectedVendor.vendorProfile?.activeUntil && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Active Until</p>
                    <p className="font-medium text-sm">{formatDate(selectedVendor.vendorProfile.activeUntil)}</p>
                  </div>
                )}
                {selectedVendor.vendorProfile?.approvalNote && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Rejection Note</p>
                    <p className="text-sm bg-destructive/10 p-2 rounded text-destructive">
                      {selectedVendor.vendorProfile.approvalNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
            {selectedVendor?.vendorProfile?.approvalStatus !== "APPROVED" ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    if (selectedVendor) openRejectDialog(selectedVendor.id);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (selectedVendor) handleApprove(selectedVendor.id);
                    setIsDetailDialogOpen(false);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            ) : (
              <>
                {selectedVendor && selectedVendor.vendorProfile?.subscriptionStatus !== "BLOCKED" && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleBlock(selectedVendor.id);
                      setIsDetailDialogOpen(false);
                    }}
                  >
                    <ShieldBan className="h-4 w-4 mr-2" />
                    Block
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Vendor Application</DialogTitle>
            <DialogDescription>
              Please provide a detailed reason for rejecting this vendor application. This will be sent to the vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RejectionReasonInput
              value={rejectionReason}
              onChange={(value) => {
                setRejectionReason(value);
                setRejectionError("");
              }}
              category="VENDOR_REJECTION"
              error={rejectionError}
              required
              showTemplates
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setSelectedVendorId(null);
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
