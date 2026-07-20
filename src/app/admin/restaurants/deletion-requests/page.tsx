"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Check, X, Eye, Building2, Phone, Trash2 } from "lucide-react";

interface DeletionRequest {
  id: string;
  restaurantId: string | null;
  restaurantName: string;
  reason: string;
  status: string;
  rejectionReason: string | null;
  resolvedAt: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string; phone: string | null };
  restaurant: { id: string; city: string; address: string; status: string } | null;
}

export default function RestaurantDeletionRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("pageSize", "20");
      const response = await fetch("/api/admin/restaurants/deletion-requests?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || [];
        const total = data.data?.total || 0;
        setRequests(Array.isArray(items) ? items : []);
        setTotalPages(Math.ceil(total / 20) || 1);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch deletion requests", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      const response = await fetch("/api/admin/restaurants/deletion-requests/" + selectedRequest.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Restaurant deleted" });
        setIsApproveOpen(false);
        setIsDetailsOpen(false);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to approve deletion request", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason) return;
    try {
      const response = await fetch("/api/admin/restaurants/deletion-requests/" + selectedRequest.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Deletion request rejected" });
        setIsRejectOpen(false);
        setIsDetailsOpen(false);
        setSelectedRequest(null);
        setRejectReason("");
        fetchRequests();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to reject deletion request", variant: "destructive" });
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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Restaurant Deletion Requests</h1>
        <p className="text-muted-foreground">
          Owners must request approval before an approved (live) restaurant can be deleted
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved (Deleted)</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead className="hidden md:table-cell">Owner</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead className="hidden lg:table-cell">Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Requested</TableHead>
              <TableHead className="w-[100px] sm:w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No deletion requests found</TableCell></TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span>{req.restaurantName}</span>
                    </div>
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    <div>{req.owner.name}</div>
                    <div className="text-sm text-muted-foreground">{req.owner.email}</div>
                    {req.owner.phone && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {req.owner.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {req.restaurant ? (
                      <>
                        <div>{req.restaurant.address}</div>
                        <div className="text-sm text-muted-foreground">{req.restaurant.city}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">Already deleted</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[240px]">
                    <p className="text-sm truncate" title={req.reason}>{req.reason}</p>
                  </TableCell>

                  <TableCell>
                    <Badge variant={statusColors[req.status]}>{req.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(req.createdAt)}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setSelectedRequest(req); setIsDetailsOpen(true); }}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {req.status === "PENDING" && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => { setSelectedRequest(req); setIsApproveOpen(true); }} title="Approve (deletes restaurant)">
                            <Trash2 className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setSelectedRequest(req); setIsRejectOpen(true); }} title="Reject">
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4 p-4">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        )}
      </div>

      {/* Approve confirmation - this permanently deletes the restaurant */}
      <AlertDialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete &quot;{selectedRequest?.restaurantName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Approving this request immediately and permanently deletes the restaurant and all its
              related data (bookings, staff, ledger, AMC contracts, orders). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} className="bg-red-600 hover:bg-red-700">
              Yes, delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Deletion Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting the deletion request for &quot;{selectedRequest?.restaurantName}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deletion Request Details</DialogTitle>
            <DialogDescription>Complete information for review</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Restaurant Name</Label>
                  <p className="font-medium">{selectedRequest.restaurantName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div><Badge variant={statusColors[selectedRequest.status]}>{selectedRequest.status}</Badge></div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Owner Information</Label>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="font-medium">{selectedRequest.owner.name}</p>
                  <p className="text-sm">{selectedRequest.owner.email}</p>
                  {selectedRequest.owner.phone && (
                    <p className="text-sm flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedRequest.owner.phone}
                    </p>
                  )}
                </div>
              </div>

              {selectedRequest.restaurant && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Address</Label>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p>{selectedRequest.restaurant.address}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.restaurant.city}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground">Owner&apos;s Reason for Deletion</Label>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p>{selectedRequest.reason}</p>
                </div>
              </div>

              {selectedRequest.status === "REJECTED" && selectedRequest.rejectionReason && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Rejection Reason</Label>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800">{selectedRequest.rejectionReason}</p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Request Date</Label>
                <p>{formatDate(selectedRequest.createdAt)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === "PENDING" && (
              <>
                <Button variant="destructive" onClick={() => { setIsDetailsOpen(false); setIsRejectOpen(true); }}>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  variant="default"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => { setIsDetailsOpen(false); setIsApproveOpen(true); }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve Deletion
                </Button>
              </>
            )}
            {selectedRequest?.status !== "PENDING" && (
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
