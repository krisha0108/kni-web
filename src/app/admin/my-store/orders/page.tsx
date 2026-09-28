"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import {
  Package, MapPin, User, Phone, Mail, Calendar, X, Clock, History,
  Search, Filter, ArrowUpDown,
  Loader2,
} from "lucide-react";
import { formatPrice, formatDate, formatDateTime } from "@/lib/utils";
import { getOrderStatusColor, getOrderStatusLabel, getNextStatuses, canUpdateStatus } from "@/lib/order-status";
import { MarketplaceOrderStatus } from "@prisma/client";
import { CancellationReasonInput } from "@/components/rejection-reason-input";

// ── Types ──

interface OrderItem {
  id: string;
  qty: number;
  priceSnapshot: number;
  product: {
    id: string;
    name: string;
    unit: string;
  };
}

interface Order {
  id: string;
  orderNumber: string | null;
  status: MarketplaceOrderStatus;
  totalAmount: number;
  statusNotes: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  statusUpdatedAt: string;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  restaurant: {
    id: string;
    name: string;
    address: string;
    city: string;
  };
  items: OrderItem[];
}

interface StatusHistoryItem {
  id: string;
  oldStatus: MarketplaceOrderStatus | null;
  newStatus: MarketplaceOrderStatus;
  notes: string | null;
  createdAt: string;
  changedByUser: {
    name: string;
    email: string;
  };
}

export default function MyStoreOrdersPage() {
  // ── Tab state ──
  const [activeTab, setActiveTab] = useState("active");

  // ── Order state ──
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [statusForm, setStatusForm] = useState({
    status: "" as MarketplaceOrderStatus,
    statusNotes: "",
    cancellationReason: "",
    expectedDeliveryDate: "",
  });
  const [cancellationError, setCancellationError] = useState("");

  // ── Search/filter for orders ──
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  const { toast } = useToast();

  // ── Data fetching ──
  useEffect(() => {
    fetchOrders();
  }, [page]);

  const fetchOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      const response = await fetch("/api/admin/my-store/orders?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data || [];
        const total = data.data?.total || 0;
        setOrders(items);
        setTotalPages(Math.ceil(total / 20) || 1);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // ── Order handlers ──
  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDialogOpen(true);
    await fetchStatusHistory(order.id);
  };

  const fetchStatusHistory = async (orderId: string) => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`/api/admin/my-store/orders/${orderId}/status`);
      const data = await response.json();
      if (data.ok) {
        setStatusHistory(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch status history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const openStatusDialog = (order: Order) => {
    setSelectedOrder(order);
    const nextStatuses = getNextStatuses(order.status);
    setStatusForm({
      status: nextStatuses[0] || order.status,
      statusNotes: "",
      cancellationReason: "",
      expectedDeliveryDate: "",
    });
    setCancellationError("");
    setIsStatusDialogOpen(true);
  };

  const closeStatusDialog = () => {
    setIsStatusDialogOpen(false);
    setStatusForm({
      status: "" as MarketplaceOrderStatus,
      statusNotes: "",
      cancellationReason: "",
      expectedDeliveryDate: "",
    });
    setCancellationError("");
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder) return;

    if (statusForm.status === "CANCELLED") {
      if (!statusForm.cancellationReason || statusForm.cancellationReason.trim().length < 10) {
        setCancellationError("Cancellation reason must be at least 10 characters");
        return;
      }
    }

    try {
      setIsUpdatingStatus(true);
      setCancellationError("");

      const response = await fetch(`/api/admin/my-store/orders/${selectedOrder.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusForm),
      });

      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: data.message || "Order status updated successfully" });
        await fetchOrders();
        closeStatusDialog();
        if (isOrderDialogOpen) {
          await fetchStatusHistory(selectedOrder.id);
          const updatedOrder = orders.find(o => o.id === selectedOrder.id);
          if (updatedOrder) setSelectedOrder(updatedOrder);
        }
      } else {
        if (statusForm.status === "CANCELLED" && data.error) {
          setCancellationError(data.error);
        } else {
          toast({ title: "Error", description: data.error || "Failed to update order status", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to update order status", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ── Computed: active vs completed orders ──
  const activeOrders = useMemo(() =>
    orders.filter(o => ["PLACED", "CONFIRMED", "PROCESSING", "SHIPPED"].includes(o.status)),
    [orders]
  );

  const completedOrders = useMemo(() =>
    orders.filter(o => ["DELIVERED", "CANCELLED"].includes(o.status)),
    [orders]
  );

  // ── Filter & sort ──
  const filterAndSort = (list: Order[]) => {
    let filtered = [...list];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) =>
        order.id.toLowerCase().includes(query) ||
        order.orderNumber?.toLowerCase().includes(query) ||
        order.owner.name.toLowerCase().includes(query) ||
        order.restaurant.name.toLowerCase().includes(query) ||
        getOrderStatusLabel(order.status).toLowerCase().includes(query)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((order) => order.status === filterStatus);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "amount-desc": return b.totalAmount - a.totalAmount;
        case "amount-asc": return a.totalAmount - b.totalAmount;
        default: return 0;
      }
    });

    return filtered;
  };

  const filteredActiveOrders = useMemo(() => filterAndSort(activeOrders), [activeOrders, searchQuery, filterStatus, sortBy]);
  const filteredCompletedOrders = useMemo(() => filterAndSort(completedOrders), [completedOrders, searchQuery, filterStatus, sortBy]);

  // ── Helpers ──
  const getStatusBadge = (status: MarketplaceOrderStatus) => (
    <Badge variant={getOrderStatusColor(status)}>
      {getOrderStatusLabel(status)}
    </Badge>
  );

  // ── Render: Order Card ──
  const renderOrderCard = (order: Order, showActions = true) => (
    <Card key={order.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              Order #{order.orderNumber ?? order.id.slice(0, 8)}
            </CardTitle>
            <CardDescription>
              {formatDateTime(order.createdAt)}
            </CardDescription>
          </div>
          {getStatusBadge(order.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{order.owner.name}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">{order.restaurant.name}</span>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground">
              {order.restaurant.address}, {order.restaurant.city}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {order.items.length} item(s)
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="font-semibold">{formatPrice(order.totalAmount)}</span>
          </div>

          {order.expectedDeliveryDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Expected: {formatDate(order.expectedDeliveryDate)}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => openOrderDetails(order)}>
              View Details
            </Button>
            {showActions && canUpdateStatus(order.status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  openStatusDialog(order);
                }}
              >
                <Clock className="h-3 w-3 mr-1" />
                Update Status
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ── Search/filter bar for orders ──
  const renderOrderFilters = (totalCount: number, filteredCount: number) => (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, customer, restaurant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest)</SelectItem>
              <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
              <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PLACED">Placed</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(searchQuery || filterStatus !== "all") && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {filteredCount} of {totalCount} orders
            </span>
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setFilterStatus("all"); setPage(1); }}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ClientOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">KNI Store - Order Management</h1>
          <p className="text-muted-foreground">
            Manage orders for KNI Official Store
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="relative">
              Active Orders
              {activeOrders.length > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                  {activeOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Active Orders ── */}
          <TabsContent value="active" className="mt-4">
            {isLoadingOrders ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activeOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">No active orders</p>
                  <p className="text-sm text-muted-foreground">New orders will appear here when customers pay via Razorpay</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {renderOrderFilters(activeOrders.length, filteredActiveOrders.length)}
                {filteredActiveOrders.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Search className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders match your filters</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredActiveOrders.map((order) => renderOrderCard(order, true))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Tab 3: Completed ── */}
          <TabsContent value="completed" className="mt-4">
            {isLoadingOrders ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : completedOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">No completed orders yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {renderOrderFilters(completedOrders.length, filteredCompletedOrders.length)}
                {filteredCompletedOrders.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Search className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders match your filters</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredCompletedOrders.map((order) => renderOrderCard(order, false))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4 p-4">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        )}

        {/* ── Order Details Dialog ── */}
        <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order ID:</span>
                      <span className="font-mono">{selectedOrder.orderNumber ?? selectedOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{formatDateTime(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span>{formatDateTime(selectedOrder.statusUpdatedAt)}</span>
                    </div>
                    {selectedOrder.expectedDeliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Delivery:</span>
                        <span>{formatDate(selectedOrder.expectedDeliveryDate)}</span>
                      </div>
                    )}
                    {selectedOrder.actualDeliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivered On:</span>
                        <span>{formatDate(selectedOrder.actualDeliveryDate)}</span>
                      </div>
                    )}
                    {selectedOrder.statusNotes && (
                      <div className="pt-2">
                        <span className="text-muted-foreground block mb-1">Status Notes:</span>
                        <p className="text-sm bg-muted p-2 rounded">{selectedOrder.statusNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Customer Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.owner.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.owner.email}</span>
                    </div>
                    {selectedOrder.owner.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedOrder.owner.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Delivery Address</h3>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{selectedOrder.restaurant.name}</p>
                      <p className="text-muted-foreground">{selectedOrder.restaurant.address}</p>
                      <p className="text-muted-foreground">{selectedOrder.restaurant.city}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.qty} {item.product.unit} x {formatPrice(item.priceSnapshot)}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatPrice(item.qty * item.priceSnapshot)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount:</span>
                    <span className="text-2xl font-bold">
                      {formatPrice(selectedOrder.totalAmount)}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Status History
                  </h3>
                  {isLoadingHistory ? (
                    <p className="text-sm text-muted-foreground">Loading history...</p>
                  ) : statusHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No status history available</p>
                  ) : (
                    <div className="space-y-3">
                      {statusHistory.map((item) => (
                        <div key={item.id} className="border-l-2 border-primary pl-4 pb-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {item.oldStatus && (
                                <>
                                  {getStatusBadge(item.oldStatus)}
                                  <span className="text-muted-foreground">→</span>
                                </>
                              )}
                              {getStatusBadge(item.newStatus)}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(item.createdAt)}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            By: {item.changedByUser.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
                Close
              </Button>
              {selectedOrder && canUpdateStatus(selectedOrder.status) && (
                <Button
                  onClick={() => {
                    setIsOrderDialogOpen(false);
                    openStatusDialog(selectedOrder);
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Status Update Dialog ── */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                Change the status of order #{selectedOrder?.orderNumber ?? selectedOrder?.id.slice(0, 8).toUpperCase()}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="status">New Status *</Label>
                  <Select
                    value={statusForm.status}
                    onValueChange={(value) =>
                      setStatusForm({ ...statusForm, status: value as MarketplaceOrderStatus })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {getNextStatuses(selectedOrder.status).map((status) => (
                        <SelectItem key={status} value={status}>
                          {getOrderStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statusNotes">Notes (Optional)</Label>
                  <Textarea
                    id="statusNotes"
                    placeholder="Add any notes about this status update..."
                    value={statusForm.statusNotes}
                    onChange={(e) =>
                      setStatusForm({ ...statusForm, statusNotes: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                {statusForm.status === "CANCELLED" && (
                  <div className="space-y-2">
                    <CancellationReasonInput
                      value={statusForm.cancellationReason}
                      onChange={(value) => {
                        setStatusForm({ ...statusForm, cancellationReason: value });
                        setCancellationError("");
                      }}
                      category="ORDER_CANCELLATION"
                      error={cancellationError}
                      required
                      showTemplates
                    />
                  </div>
                )}

                {(statusForm.status === "SHIPPED" || statusForm.status === "PROCESSING") && (
                  <div className="space-y-2">
                    <Label htmlFor="expectedDeliveryDate">Expected Delivery Date (Optional)</Label>
                    <Input
                      id="expectedDeliveryDate"
                      type="date"
                      value={statusForm.expectedDeliveryDate}
                      onChange={(e) =>
                        setStatusForm({ ...statusForm, expectedDeliveryDate: e.target.value })
                      }
                    />
                  </div>
                )}

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Current Status: <span className="font-medium">{getOrderStatusLabel(selectedOrder.status)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    New Status: <span className="font-medium">{getOrderStatusLabel(statusForm.status)}</span>
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeStatusDialog} disabled={isUpdatingStatus}>
                Cancel
              </Button>
              <Button onClick={updateOrderStatus} disabled={isUpdatingStatus || !statusForm.status}>
                {isUpdatingStatus ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  );
}
