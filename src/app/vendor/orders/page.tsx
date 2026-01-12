"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, User, Phone, Mail, Calendar, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

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
  status: "PLACED" | "CANCELLED";
  totalAmount: number;
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

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const url = filterStatus === "all"
        ? "/api/vendor/orders"
        : `/api/vendor/orders?status=${filterStatus}`;

      const response = await fetch(url);
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

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedOrder(null);
  };

  const updateOrderStatus = async (orderId: string, status: "PLACED" | "CANCELLED") => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/vendor/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Order status updated successfully",
        });
        fetchOrders();
        closeDialog();
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PLACED: "default",
      CANCELLED: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const filteredOrders = orders;

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

        <div className="flex gap-4 items-center">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="PLACED">Placed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
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
                      {order.status === "PLACED" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateOrderStatus(order.id, "CANCELLED");
                          }}
                          disabled={isUpdating}
                        >
                          Cancel Order
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
                      <span className="text-muted-foreground">Date:</span>
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
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Close
              </Button>
              {selectedOrder?.status === "PLACED" && (
                <Button
                  variant="destructive"
                  onClick={() => updateOrderStatus(selectedOrder.id, "CANCELLED")}
                  disabled={isUpdating}
                >
                  Cancel Order
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  );
}
