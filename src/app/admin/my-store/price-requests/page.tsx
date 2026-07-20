"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientOnly } from "@/components/client-only";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Package, Tag, Check, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface PriceRequest {
  id: string;
  owner: { id: string; name: string; email: string; phone: string | null };
  restaurant: { id: string; name: string; city: string };
  productName: string;
  productImage: string | null;
  productUnit: string;
  vendorProductId: string;
  currentPrice: number;
  quantity: number | null;
  message: string | null;
  status: "PENDING" | "COUNTERED" | "UNLOCKED" | "DECLINED";
  unlockedPrice: number | null;
  ownerCounterPrice: number | null;
  validUntil: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PriceRequestsPage() {
  const [requests, setRequests] = useState<PriceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [isRespondOpen, setIsRespondOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PriceRequest | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [respondForm, setRespondForm] = useState({
    unlockedPrice: "",
    validUntil: "",
    adminNote: "",
  });

  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);
      params.set("page", String(page));
      params.set("limit", "20");

      const response = await fetch("/api/admin/my-store/price-requests?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data || [];
        const total = data.data?.total || 0;
        setRequests(items);
        setTotalPages(Math.ceil(total / 20) || 1);
        setPendingCount(data.pendingCount || 0);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch price requests", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [search, statusFilter, page]);

  const openRespondDialog = (request: PriceRequest) => {
    setSelectedRequest(request);
    setRespondForm({
      unlockedPrice:
        request.ownerCounterPrice?.toString() ||
        request.unlockedPrice?.toString() ||
        request.currentPrice?.toString() ||
        "",
      validUntil: "",
      adminNote: request.adminNote || "",
    });
    setIsRespondOpen(true);
  };

  const handleRespond = async (action: "UNLOCK" | "DECLINE") => {
    if (!selectedRequest) return;

    if (action === "UNLOCK" && !respondForm.unlockedPrice) {
      toast({ title: "Error", description: "Please enter a price", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/admin/my-store/price-requests/${selectedRequest.id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "UNLOCK" ? {
            unlockedPrice: parseInt(respondForm.unlockedPrice, 10),
            validUntil: respondForm.validUntil ? new Date(respondForm.validUntil).toISOString() : undefined,
          } : {}),
          adminNote: respondForm.adminNote || undefined,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: action === "UNLOCK"
            ? `Price ₹${parseInt(respondForm.unlockedPrice).toLocaleString("en-IN")} sent to ${selectedRequest.owner.name}`
            : "Request declined",
        });
        setIsRespondOpen(false);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to respond", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">Pending</Badge>;
      case "COUNTERED":
        return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">Countered</Badge>;
      case "UNLOCKED":
        return <Badge variant="success">Unlocked</Badge>;
      case "DECLINED":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <ClientOnly>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
              Price Requests
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-sm">{pendingCount} pending</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Manage price unlock requests from restaurant owners
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by owner, restaurant, or product..."
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
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COUNTERED">Countered</SelectItem>
                <SelectItem value="UNLOCKED">Unlocked</SelectItem>
                <SelectItem value="DECLINED">Declined</SelectItem>
              </SelectContent>
            </Select>
          </ClientOnly>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No price requests yet</p>
            <p className="text-sm text-muted-foreground">
              When owners request prices for &quot;Price on Request&quot; products, they&apos;ll appear here
            </p>
          </div>
        ) : (
          <>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap px-2 sm:px-4">Product</TableHead>
                    <TableHead className="whitespace-nowrap px-2 sm:px-4">Owner</TableHead>
                    <TableHead className="whitespace-nowrap px-2 sm:px-4">Restaurant</TableHead>
                    <TableHead className="whitespace-nowrap px-2 sm:px-4">Qty</TableHead>
                    <TableHead className="whitespace-nowrap px-2 sm:px-4">Base Price</TableHead>
                    <TableHead className="whitespace-nowrap px-2 sm:px-4">Unlocked</TableHead>
                    <TableHead className="whitespace-nowrap px-2 sm:px-4">Status</TableHead>
                    <TableHead className="whitespace-nowrap px-2 sm:px-4">Date</TableHead>
                    <TableHead className="whitespace-nowrap px-2 sm:px-4 w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} className={req.status === "PENDING" || req.status === "COUNTERED" ? "bg-yellow-50/50" : ""}>
                      <TableCell className="px-2 sm:px-4">
                        <div className="flex items-center gap-2">
                          {req.productImage ? (
                            <img src={req.productImage} alt={req.productName} className="h-8 w-8 rounded object-cover flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-xs sm:text-sm">{req.productName}</div>
                            <div className="text-xs text-muted-foreground">per {req.productUnit}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <div className="text-xs sm:text-sm font-medium">{req.owner.name}</div>
                        <div className="text-xs text-muted-foreground">{req.owner.phone || req.owner.email}</div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <div className="text-xs sm:text-sm">{req.restaurant.name}</div>
                        <div className="text-xs text-muted-foreground">{req.restaurant.city}</div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 text-xs sm:text-sm">
                        {req.quantity || "-"}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                        {formatPrice(req.currentPrice)}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap font-medium">
                        {req.unlockedPrice ? formatPrice(req.unlockedPrice) : "-"}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">
                        {getStatusBadge(req.status)}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <Button
                          variant={req.status === "PENDING" || req.status === "COUNTERED" ? "default" : "outline"}
                          size="sm"
                          onClick={() => openRespondDialog(req)}
                          className="text-xs"
                        >
                          {req.status === "PENDING" ? "Respond" : req.status === "COUNTERED" ? "Review Counter" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4 p-4">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          )}
          </>
        )}

        {/* Respond Dialog */}
        <Dialog open={isRespondOpen} onOpenChange={(open) => {
          setIsRespondOpen(open);
          if (!open) setSelectedRequest(null);
        }}>
          <DialogContent className="w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedRequest?.status === "PENDING" || selectedRequest?.status === "COUNTERED"
                  ? "Respond to Price Request"
                  : "Price Request Details"}
              </DialogTitle>
              <DialogDescription>
                Set a custom price for this owner
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4 py-4">
                {/* Product info */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  {selectedRequest.productImage ? (
                    <img src={selectedRequest.productImage} alt={selectedRequest.productName} className="h-12 w-12 rounded object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{selectedRequest.productName}</div>
                    <div className="text-sm text-muted-foreground">
                      Base price: {formatPrice(selectedRequest.currentPrice)} / {selectedRequest.productUnit}
                    </div>
                  </div>
                </div>

                {/* Owner info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Owner:</span>
                    <div className="font-medium">{selectedRequest.owner.name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Restaurant:</span>
                    <div className="font-medium">{selectedRequest.restaurant.name}</div>
                  </div>
                  {selectedRequest.quantity && (
                    <div>
                      <span className="text-muted-foreground">Requested Qty:</span>
                      <div className="font-medium">{selectedRequest.quantity} units</div>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                </div>

                {selectedRequest.message && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <span className="font-medium text-blue-800">Owner&apos;s message:</span>
                    <p className="text-blue-700 mt-1">{selectedRequest.message}</p>
                  </div>
                )}

                {selectedRequest.status === "COUNTERED" && selectedRequest.ownerCounterPrice && (
                  <div className="p-3 bg-orange-50 rounded-lg text-sm">
                    <span className="font-medium text-orange-800">
                      {selectedRequest.owner.name} countered your price of {selectedRequest.unlockedPrice ? formatPrice(selectedRequest.unlockedPrice) : "-"} with:
                    </span>
                    <p className="text-orange-900 font-bold text-lg mt-1">
                      {formatPrice(selectedRequest.ownerCounterPrice)}
                    </p>
                  </div>
                )}

                {(selectedRequest.status === "PENDING" || selectedRequest.status === "COUNTERED") && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="unlockedPrice">Your Price for this Owner (₹) *</Label>
                      <Input
                        id="unlockedPrice"
                        type="number"
                        value={respondForm.unlockedPrice}
                        onChange={(e) => setRespondForm({ ...respondForm, unlockedPrice: e.target.value })}
                        placeholder="e.g., 42000"
                      />
                      <p className="text-xs text-muted-foreground">
                        This price will only be visible to {selectedRequest.owner.name}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="validUntil">Price Valid Until (optional)</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={respondForm.validUntil}
                        onChange={(e) => setRespondForm({ ...respondForm, validUntil: e.target.value })}
                        min={new Date().toISOString().split("T")[0]}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty for no expiry
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminNote">Note to Owner (optional)</Label>
                      <Textarea
                        id="adminNote"
                        value={respondForm.adminNote}
                        onChange={(e) => setRespondForm({ ...respondForm, adminNote: e.target.value })}
                        placeholder="e.g., Bulk discount applied, special rate for repeat customer..."
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {selectedRequest.status === "UNLOCKED" || selectedRequest.status === "DECLINED" ? (
                  <div className="space-y-2">
                    {selectedRequest.unlockedPrice && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <span className="text-green-800 font-medium">Unlocked Price: </span>
                        <span className="text-green-900 font-bold">{formatPrice(selectedRequest.unlockedPrice)}</span>
                        {selectedRequest.validUntil && (
                          <span className="text-green-700 text-sm ml-2">
                            (valid until {new Date(selectedRequest.validUntil).toLocaleDateString("en-IN")})
                          </span>
                        )}
                      </div>
                    )}
                    {selectedRequest.adminNote && (
                      <div className="p-3 bg-gray-50 rounded-lg text-sm">
                        <span className="font-medium">Admin note:</span>
                        <p className="mt-1">{selectedRequest.adminNote}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            <DialogFooter className="gap-2">
              {selectedRequest?.status === "PENDING" || selectedRequest?.status === "COUNTERED" ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleRespond("DECLINE")}
                    disabled={isSaving}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                  <Button
                    onClick={() => handleRespond("UNLOCK")}
                    disabled={isSaving}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {isSaving ? "Sending..." : "Unlock Price"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsRespondOpen(false)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  );
}
