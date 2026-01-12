"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatPrice } from "@/lib/utils";
import { Package, Store, MapPin, Calendar, Phone } from "lucide-react";

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
  vendor: {
    id: string;
    name: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
  items: OrderItem[];
}

export default function OwnerMarketplaceOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/owner/marketplace/orders");
      const data = await response.json();

      if (data.ok) {
        // API returns array directly in data.data
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

  useEffect(() => {
    fetchOrders();
  }, []);

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedOrder(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PLACED: "default",
      CANCELLED: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Marketplace Orders</h1>
          <p className="text-muted-foreground">
            Track your product orders from vendors
          </p>
        </div>
        <Button onClick={() => window.location.href = "/owner/marketplace"}>
          Browse Products
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No orders found</p>
            <Button onClick={() => window.location.href = "/owner/marketplace"}>
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(order.createdAt)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Vendor:</span>
                    <span className="text-muted-foreground">{order.vendor.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Restaurant:</span>
                    <span className="text-muted-foreground">{order.restaurant.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {order.items.length} item(s)
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-semibold">{formatPrice(order.totalAmount)}</span>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Items:</p>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="text-sm text-muted-foreground flex justify-between">
                          <span>
                            {item.product.name} ({item.qty} {item.product.unit})
                          </span>
                          <span>{formatPrice(item.qty * item.priceSnapshot)}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          +{order.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => openOrderDetails(order)}>
                      View Full Details
                    </Button>
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
                    <span className="text-muted-foreground">Order Date:</span>
                    <span>{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Vendor Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOrder.vendor.name}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Delivery Address</h3>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{selectedOrder.restaurant.name}</p>
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

              {selectedOrder.status === "PLACED" && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Order Status:</strong> Your order has been placed and is awaiting vendor confirmation.
                    You will be notified when the vendor updates the order status.
                  </p>
                </div>
              )}

              {selectedOrder.status === "CANCELLED" && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-900 dark:text-red-100">
                    <strong>Order Cancelled:</strong> This order has been cancelled by the vendor.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
