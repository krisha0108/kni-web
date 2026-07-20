"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Search,
  Eye,
  UserCheck,
  UserX,
  Users,
  UserPlus,
  Building2,
  Calendar,
  Loader2,
  Trash2,
  Clock,
  Check,
  X,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

type OwnerApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  approvalStatus: OwnerApprovalStatus;
  rejectionReason: string | null;
  restaurantCount: number;
  totalBookings: number;
}

interface OwnerDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  serviceDiscountPercent: number | null;
  ownerProfile: {
    approvalStatus: OwnerApprovalStatus;
    rejectionReason: string | null;
    approvedAt: string | null;
  } | null;
  restaurants: {
    id: string;
    name: string;
    address: string;
    city: string;
    status: string;
    createdAt: string;
  }[];
  stats: {
    totalRestaurants: number;
    approvedRestaurants: number;
    pendingRestaurants: number;
    totalBookings: number;
    totalOrders: number;
  };
}

interface Stats {
  totalOwners: number;
  activeOwners: number;
  inactiveOwners: number;
  newThisMonth: number;
  pendingApprovalOwners: number;
}

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const { toast } = useToast();

  const fetchOwners = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      params.set("page", page.toString());
      params.set("pageSize", "20");

      const response = await fetch("/api/admin/owners?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || data.total || 0;
        const pSize = data.data?.pageSize || 20;
        setOwners(Array.isArray(items) ? items : []);
        setTotalPages(data.totalPages || Math.ceil(total / pSize) || 1);
        setStats(data.data.stats || null);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch owners", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, [search, statusFilter, page]);

  const openDetailDialog = async (ownerId: string) => {
    setIsLoadingDetail(true);
    setIsDetailDialogOpen(true);

    try {
      const response = await fetch(`/api/admin/owners/${ownerId}`);
      const data = await response.json();
      if (data.ok) {
        setSelectedOwner(data.data);
        setDiscountInput(
          data.data.serviceDiscountPercent != null ? String(data.data.serviceDiscountPercent) : ""
        );
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        setIsDetailDialogOpen(false);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch owner details", variant: "destructive" });
      setIsDetailDialogOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleToggleStatus = async (ownerId: string, newStatus: boolean) => {
    setIsTogglingStatus(true);
    try {
      const response = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: newStatus ? "Owner activated successfully" : "Owner deactivated successfully",
        });
        fetchOwners();
        if (selectedOwner && selectedOwner.id === ownerId) {
          setSelectedOwner({ ...selectedOwner, isActive: newStatus });
        }
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update owner status", variant: "destructive" });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleSaveDiscount = async (ownerId: string) => {
    const trimmed = discountInput.trim();
    let value: number | null;
    if (trimmed === "") {
      value = null;
    } else {
      value = Number(trimmed);
      if (Number.isNaN(value) || value < 0 || value > 100) {
        toast({ title: "Error", description: "Discount must be a number between 0 and 100", variant: "destructive" });
        return;
      }
    }

    setIsSavingDiscount(true);
    try {
      const response = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceDiscountPercent: value }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Owner discount updated successfully" });
        if (selectedOwner && selectedOwner.id === ownerId) {
          setSelectedOwner({ ...selectedOwner, serviceDiscountPercent: value });
        }
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update owner discount", variant: "destructive" });
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const handleApprove = async (ownerId: string) => {
    setIsSubmittingApproval(true);
    try {
      const response = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Owner Approved", description: "The owner can now log in and add a restaurant." });
        fetchOwners();
        if (selectedOwner && selectedOwner.id === ownerId) {
          setIsDetailDialogOpen(false);
        }
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to approve owner", variant: "destructive" });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (rejectionReason.trim().length < 10) {
      toast({ title: "Error", description: "Rejection reason must be at least 10 characters", variant: "destructive" });
      return;
    }
    setIsSubmittingApproval(true);
    try {
      const response = await fetch(`/api/admin/owners/${rejectTarget.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Owner Rejected", description: "The owner has been notified." });
        setRejectTarget(null);
        setRejectionReason("");
        setIsDetailDialogOpen(false);
        fetchOwners();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to reject owner", variant: "destructive" });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/owners/${deleteTarget.id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Deleted", description: data.message });
        setDeleteTarget(null);
        setIsDetailDialogOpen(false);
        fetchOwners();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete owner", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const statusColors: Record<string, "default" | "success" | "destructive" | "warning"> = {
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Owners</h1>
        <p className="text-muted-foreground">Manage restaurant owner accounts</p>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Owners</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOwners}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pendingApprovalOwners}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeOwners}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inactiveOwners}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.newThisMonth}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <ClientOnly>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      {/* Owners Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap px-2 sm:px-4">Name</TableHead>
                <TableHead className="whitespace-nowrap px-2 sm:px-4">Email</TableHead>
                <TableHead className="whitespace-nowrap px-2 sm:px-4">Phone</TableHead>
                <TableHead className="whitespace-nowrap px-2 sm:px-4">Restaurants</TableHead>
                <TableHead className="whitespace-nowrap px-2 sm:px-4">Approval</TableHead>
                <TableHead className="whitespace-nowrap px-2 sm:px-4">Status</TableHead>
                <TableHead className="whitespace-nowrap px-2 sm:px-4">Joined</TableHead>
                <TableHead className="whitespace-nowrap px-2 sm:px-4 w-[220px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : owners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No owners found
                  </TableCell>
                </TableRow>
              ) : (
                owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-medium whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm">
                      {owner.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm">
                      {owner.email}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm">
                      {owner.phone || "-"}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                        {owner.restaurantCount} {owner.restaurantCount !== 1 ? "restaurants" : "restaurant"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <Badge variant={statusColors[owner.approvalStatus] || "default"} className="text-xs whitespace-nowrap">
                        {owner.approvalStatus === "PENDING" ? "Pending Approval" : owner.approvalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <Badge variant={owner.isActive ? "success" : "destructive"} className="text-xs whitespace-nowrap">
                        {owner.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm">
                      {formatDate(owner.createdAt)}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <div className="flex items-center gap-1">
                        {owner.approvalStatus === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(owner.id)}
                              title="Approve registration"
                              disabled={isSubmittingApproval}
                              className="h-8 px-2.5 gap-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectTarget({ id: owner.id, name: owner.name })}
                              title="Reject registration"
                              disabled={isSubmittingApproval}
                              className="h-8 px-2.5 gap-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Reject</span>
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDetailDialog(owner.id)}
                          title="View details"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {owner.approvalStatus !== "PENDING" && (
                          owner.isActive ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(owner.id, false)}
                              title="Deactivate owner"
                              disabled={isTogglingStatus}
                              className="h-8 w-8 p-0"
                            >
                              <UserX className="h-4 w-4 text-red-600" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(owner.id, true)}
                              title="Activate owner"
                              disabled={isTogglingStatus}
                              className="h-8 w-8 p-0"
                            >
                              <UserCheck className="h-4 w-4 text-green-600" />
                            </Button>
                          )
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget({ id: owner.id, name: owner.name })}
                          title="Delete owner permanently"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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

      {/* Owner Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Owner Details</DialogTitle>
            <DialogDescription>
              View owner information and their restaurants
            </DialogDescription>
          </DialogHeader>
          {isLoadingDetail ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : selectedOwner ? (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Owner Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedOwner.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedOwner.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedOwner.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={selectedOwner.isActive ? "success" : "destructive"}>
                      {selectedOwner.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approval</p>
                    <Badge variant={statusColors[selectedOwner.ownerProfile?.approvalStatus || "APPROVED"] || "default"}>
                      {selectedOwner.ownerProfile?.approvalStatus === "PENDING"
                        ? "Pending Approval"
                        : selectedOwner.ownerProfile?.approvalStatus || "APPROVED"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">{formatDate(selectedOwner.createdAt)}</p>
                  </div>
                </div>
                {selectedOwner.ownerProfile?.approvalStatus === "REJECTED" && selectedOwner.ownerProfile.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    <span className="font-semibold">Rejection reason: </span>
                    {selectedOwner.ownerProfile.rejectionReason}
                  </div>
                )}
              </div>

              {/* Discount Override */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Service/Parts Discount
                </h4>
                <div className="flex items-end gap-2">
                  <div className="flex-1 max-w-[160px]">
                    <p className="text-sm text-muted-foreground mb-1">Custom discount % (leave blank to rely on active offers only)</p>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Default"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSaveDiscount(selectedOwner.id)}
                    disabled={isSavingDiscount}
                  >
                    {isSavingDiscount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Quick Stats
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedOwner.stats.totalRestaurants}</p>
                      <p className="text-xs text-muted-foreground">Restaurants</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{selectedOwner.stats.approvedRestaurants}</p>
                      <p className="text-xs text-muted-foreground">Approved</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedOwner.stats.totalBookings}</p>
                      <p className="text-xs text-muted-foreground">Bookings</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedOwner.stats.totalOrders}</p>
                      <p className="text-xs text-muted-foreground">Orders</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Restaurants */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Restaurants ({selectedOwner.restaurants.length})
                </h4>
                {selectedOwner.restaurants.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedOwner.restaurants.map((restaurant) => (
                      <div
                        key={restaurant.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{restaurant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {restaurant.address}, {restaurant.city}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(restaurant.createdAt)}
                          </p>
                        </div>
                        <Badge variant={statusColors[restaurant.status] || "default"}>
                          {restaurant.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No restaurants registered
                  </p>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            {selectedOwner && selectedOwner.ownerProfile?.approvalStatus === "PENDING" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setRejectTarget({ id: selectedOwner.id, name: selectedOwner.name })}
                  disabled={isSubmittingApproval}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedOwner.id)}
                  disabled={isSubmittingApproval}
                >
                  {isSubmittingApproval ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4 mr-2" />
                  )}
                  Approve Registration
                </Button>
              </>
            )}
            {selectedOwner && selectedOwner.ownerProfile?.approvalStatus !== "PENDING" && (
              <>
                {selectedOwner.isActive ? (
                  <Button
                    variant="destructive"
                    onClick={() => handleToggleStatus(selectedOwner.id, false)}
                    disabled={isTogglingStatus}
                  >
                    {isTogglingStatus ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserX className="h-4 w-4 mr-2" />
                    )}
                    Deactivate Owner
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleToggleStatus(selectedOwner.id, true)}
                    disabled={isTogglingStatus}
                  >
                    {isTogglingStatus ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    Activate Owner
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Registration Dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectionReason(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Tell <strong>{rejectTarget?.name}</strong> why their owner registration was rejected. This is shown to them.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. FSSAI details could not be verified. Please reapply with valid documents."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRejectTarget(null); setRejectionReason(""); }}
              disabled={isSubmittingApproval}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmittingApproval}>
              {isSubmittingApproval ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserX className="h-4 w-4 mr-2" />
              )}
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Owner Permanently?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  <p className="font-semibold mb-1">This action cannot be undone. The following data will be permanently deleted:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>All restaurants owned by this user</li>
                    <li>All service bookings and payment records</li>
                    <li>All marketplace orders and payments</li>
                    <li>All AMC contracts and requests</li>
                    <li>All equipment records</li>
                    <li>All notifications and sessions</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="mr-2 h-4 w-4" /> Delete Permanently</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}