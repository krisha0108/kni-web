"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, User, Phone, Mail, Calendar, X, Clock, History, Search, Filter, ArrowUpDown } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { getOrderStatusColor, getOrderStatusLabel, getNextStatuses, canUpdateStatus } from "@/lib/order-status";
import { MarketplaceOrderStatus } from "@prisma/client";

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

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDeliveryStatus, setFilterDeliveryStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  const [statusForm, setStatusForm] = useState({
    status: "" as MarketplaceOrderStatus,
    statusNotes: "",
    expectedDeliveryDate: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/vendor/orders");
      const data = await response.json();

      if (data.ok) {
        setOrders(data.data || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch orders",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
    await fetchStatusHistory(order.id);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedOrder(null);
    setStatusHistory([]);
  };

  const fetchStatusHistory = async (orderId: string) => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`/api/vendor/orders/${orderId}/status`);
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
      expectedDeliveryDate: "",
    });
    setIsStatusDialogOpen(true);
  };

  const closeStatusDialog = () => {
    setIsStatusDialogOpen(false);
    setStatusForm({
      status: "" as MarketplaceOrderStatus,
      statusNotes: "",
      expectedDeliveryDate: "",
    });
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/vendor/orders/${selectedOrder.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusForm),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: data.message || "Order status updated successfully",
        });
        await fetchOrders();
        closeStatusDialog();
        if (isDialogOpen) {
          await fetchStatusHistory(selectedOrder.id);
          // Update the selected order with new data
          const updatedOrder = orders.find(o => o.id === selectedOrder.id);
          if (updatedOrder) {
            setSelectedOrder(updatedOrder);
          }
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update order status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: MarketplaceOrderStatus) => {
    return (
      <Badge variant={getOrderStatusColor(status)}>
        {getOrderStatusLabel(status)}
      </Badge>
    );
  };

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) =>
        order.id.toLowerCase().includes(query) ||
        order.owner.name.toLowerCase().includes(query) ||
        order.restaurant.name.toLowerCase().includes(query) ||
        getOrderStatusLabel(order.status).toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((order) => order.status === filterStatus);
    }

    // Delivery status filter
    if (filterDeliveryStatus !== "all") {
      filtered = filtered.filter((order) => {
        if (filterDeliveryStatus === "pending") {
          return !order.actualDeliveryDate && order.status !== "DELIVERED";
        } else if (filterDeliveryStatus === "delivered") {
          return order.status === "DELIVERED" && order.actualDeliveryDate;
        } else if (filterDeliveryStatus === "delayed") {
          return order.expectedDeliveryDate &&
                 !order.actualDeliveryDate &&
                 new Date(order.expectedDeliveryDate) < new Date();
        }
        return true;
      });
    }

    // Date range filter (order date)
    if (filterDateFrom) {
      filtered = filtered.filter((order) =>
        new Date(order.createdAt) >= new Date(filterDateFrom)
      );
    }
    if (filterDateTo) {
      filtered = filtered.filter((order) =>
        new Date(order.createdAt) <= new Date(filterDateTo)
      );
    }

    // Amount range filter
    if (filterMinAmount) {
      filtered = filtered.filter((order) =>
        order.totalAmount >= parseFloat(filterMinAmount)
      );
    }
    if (filterMaxAmount) {
      filtered = filtered.filter((order) =>
        order.totalAmount <= parseFloat(filterMaxAmount)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "amount-desc":
          return b.totalAmount - a.totalAmount;
        case "amount-asc":
          return a.totalAmount - b.totalAmount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [orders, searchQuery, filterStatus, filterDeliveryStatus, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount, sortBy]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== "all") count++;
    if (filterDeliveryStatus !== "all") count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    if (filterMinAmount) count++;
    if (filterMaxAmount) count++;
    return count;
  }, [filterStatus, filterDeliveryStatus, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount]);

  // Clear all filters
  const clearFilters = () => {
    setFilterStatus("all");
    setFilterDeliveryStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterMinAmount("");
    setFilterMaxAmount("");
  };

  return (
    <ClientOnly>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Orders</h1>
            <p className="text-muted-foreground">
              Manage orders from restaurant owners
            </p>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID, customer, restaurant, or status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-[200px]">
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

              {/* Filter Button */}
              <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="relative">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Filter Orders</DialogTitle>
                    <DialogDescription>
                      Apply filters to narrow down your orders
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Order Status Filter */}
                    <div className="space-y-2">
                      <Label>Order Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                          <SelectValue />
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

                    {/* Delivery Status Filter */}
                    <div className="space-y-2">
                      <Label>Delivery Status</Label>
                      <Select value={filterDeliveryStatus} onValueChange={setFilterDeliveryStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Delivery Status</SelectItem>
                          <SelectItem value="pending">Pending Delivery</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Order Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Order From</Label>
                        <Input
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Order To</Label>
                        <Input
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Amount Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Min Amount (₹)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={filterMinAmount}
                          onChange={(e) => setFilterMinAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Amount (₹)</Label>
                        <Input
                          type="number"
                          placeholder="No limit"
                          value={filterMaxAmount}
                          onChange={(e) => setFilterMaxAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear All
                    </Button>
                    <Button onClick={() => setIsFilterDialogOpen(false)}>
                      Apply Filters
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Active Filters Display */}
            {(searchQuery || activeFiltersCount > 0) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {searchQuery}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setSearchQuery("")}
                    />
                  </Badge>
                )}
                {filterStatus !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {getOrderStatusLabel(filterStatus as MarketplaceOrderStatus)}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setFilterStatus("all")}
                    />
                  </Badge>
                )}
                {filterDeliveryStatus !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Delivery: {filterDeliveryStatus.charAt(0).toUpperCase() + filterDeliveryStatus.slice(1)}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setFilterDeliveryStatus("all")}
                    />
                  </Badge>
                )}
                {filterDateFrom && (
                  <Badge variant="secondary" className="gap-1">
                    From: {filterDateFrom}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setFilterDateFrom("")}
                    />
                  </Badge>
                )}
                {filterDateTo && (
                  <Badge variant="secondary" className="gap-1">
                    To: {filterDateTo}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setFilterDateTo("")}
                    />
                  </Badge>
                )}
                {filterMinAmount && (
                  <Badge variant="secondary" className="gap-1">
                    Min: ₹{filterMinAmount}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setFilterMinAmount("")}
                    />
                  </Badge>
                )}
                {filterMaxAmount && (
                  <Badge variant="secondary" className="gap-1">
                    Max: ₹{filterMaxAmount}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setFilterMaxAmount("")}
                    />
                  </Badge>
                )}
              </div>
            )}

            {/* Results Count */}
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 && orders.length > 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No orders match your filters</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
              <Button className="mt-4" variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        Order #{order.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription>
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                      <span className="text-muted-foreground">•</span>
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
                      <span className="text-muted-foreground">•</span>
                      <span className="font-semibold">{formatPrice(order.totalAmount)}</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => openOrderDetails(order)}>
                        View Details
                      </Button>
                      {canUpdateStatus(order.status) && (
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
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      <span className="font-mono">{selectedOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Placed:</span>
                      <span>
                        {new Date(selectedOrder.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span>
                        {new Date(selectedOrder.statusUpdatedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {selectedOrder.expectedDeliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Delivery:</span>
                        <span>
                          {new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                    {selectedOrder.actualDeliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivered On:</span>
                        <span>
                          {new Date(selectedOrder.actualDeliveryDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
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
                      <p className="text-muted-foreground">
                        {selectedOrder.restaurant.address}
                      </p>
                      <p className="text-muted-foreground">{selectedOrder.restaurant.city}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.qty} {item.product.unit} × {formatPrice(item.priceSnapshot)}
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
                              {new Date(item.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
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
              <Button variant="outline" onClick={closeDialog}>
                Close
              </Button>
              {selectedOrder && canUpdateStatus(selectedOrder.status) && (
                <Button
                  onClick={() => {
                    closeDialog();
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

        {/* Status Update Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                Change the status of order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
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
              <Button variant="outline" onClick={closeStatusDialog} disabled={isUpdating}>
                Cancel
              </Button>
              <Button onClick={updateOrderStatus} disabled={isUpdating || !statusForm.status}>
                {isUpdating ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  );
}
