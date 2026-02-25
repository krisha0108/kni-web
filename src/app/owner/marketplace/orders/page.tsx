"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatPrice } from "@/lib/utils";
import { Package, Store, MapPin, Calendar, Phone, Building2, Star, CreditCard, Clock, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import { useRestaurant } from "@/contexts/restaurant-context";
import { VendorRatingDialog } from "@/components/ratings/vendor-rating-dialog";

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

type OrderStatus = "PLACED" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

interface Order {
  id: string;
  status: OrderStatus;
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

interface PaymentItem {
  productId: string;
  qty: number;
  priceSnapshot: number;
  name: string;
}

interface Payment {
  id: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  totalAmount: number;
  items: PaymentItem[];
  screenshotUrl: string;
  deliveryAddress: string | null;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  verifiedAt: string | null;
  vendor: {
    id: string;
    name: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
  order: {
    id: string;
    status: string;
  } | null;
}

export default function OwnerMarketplaceOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [orderToRate, setOrderToRate] = useState<Order | null>(null);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");

  const fetchOrders = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/owner/marketplace/orders?restaurantId=${selectedRestaurant.restaurantId}`);
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

  const fetchPayments = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoadingPayments(true);
      const response = await fetch(`/api/owner/marketplace/payments?restaurantId=${selectedRestaurant.restaurantId}`);
      const data = await response.json();

      if (data.ok) {
        setPayments(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (selectedRestaurant) {
      fetchOrders();
      fetchPayments();
    }
  }, [selectedRestaurant]);

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedOrder(null);
  };

  const openRatingDialog = (order: Order) => {
    setOrderToRate(order);
    setIsRatingDialogOpen(true);
  };

  const handleRatingSuccess = () => {
    fetchOrders();
    setIsRatingDialogOpen(false);
    setOrderToRate(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PLACED: "outline",
      CONFIRMED: "secondary",
      PROCESSING: "default",
      SHIPPED: "default",
      DELIVERED: "default",
      CANCELLED: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    if (status === "PENDING") {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending Verification</Badge>;
    }
    if (status === "VERIFIED") {
      return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
    }
    if (status === "REJECTED") {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const pendingPaymentsCount = payments.filter(p => p.status === "PENDING").length;

  if (!selectedRestaurant) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Please select a restaurant</p>
          <p className="text-sm text-muted-foreground mt-2">Use the restaurant switcher in the header to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Marketplace Orders</h1>
          <p className="text-muted-foreground">View your orders and payments for {selectedRestaurant.restaurant.name}</p>
        </div>
        <Button onClick={() => window.location.href = "/owner/marketplace"}>
          Browse Products
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders" className="gap-1.5">
            <Package className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            Payments
            {pendingPaymentsCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-xs">
                {pendingPaymentsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===== ORDERS TAB ===== */}
        <TabsContent value="orders">
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
                        <span className="text-muted-foreground">&bull;</span>
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
                        {order.status === "DELIVERED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRatingDialog(order);
                            }}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Rate Vendor
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== PAYMENTS TAB ===== */}
        <TabsContent value="payments">
          {isLoadingPayments ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No payments found</p>
                <p className="text-sm text-muted-foreground">
                  When you pay for marketplace orders, your payment status will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {payments.map((payment) => {
                const items = (payment.items || []) as PaymentItem[];
                return (
                  <Card
                    key={payment.id}
                    className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                      payment.status === "PENDING" ? "border-yellow-300 dark:border-yellow-700" :
                      payment.status === "REJECTED" ? "border-red-300 dark:border-red-700" : ""
                    }`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            Payment #{payment.id.slice(0, 8).toUpperCase()}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {formatDate(payment.createdAt)}
                          </CardDescription>
                        </div>
                        {getPaymentStatusBadge(payment.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Vendor:</span>
                          <span className="text-muted-foreground">{payment.vendor.name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {items.length} item(s)
                          </span>
                          <span className="text-muted-foreground">&bull;</span>
                          <span className="font-semibold">{formatPrice(payment.totalAmount)}</span>
                        </div>

                        <div className="border-t pt-3">
                          <p className="text-sm font-medium mb-2">Items:</p>
                          <div className="space-y-1">
                            {items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="text-sm text-muted-foreground flex justify-between">
                                <span>{item.name} (x{item.qty})</span>
                                <span>{formatPrice(item.qty * item.priceSnapshot)}</span>
                              </div>
                            ))}
                            {items.length > 3 && (
                              <p className="text-sm text-muted-foreground">
                                +{items.length - 3} more items
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status-specific messages */}
                        {payment.status === "PENDING" && (
                          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              <Clock className="h-3.5 w-3.5 inline mr-1" />
                              Waiting for vendor to verify your payment. You&apos;ll be notified once verified.
                            </p>
                          </div>
                        )}

                        {payment.status === "VERIFIED" && payment.order && (
                          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                              Payment verified! Order #{payment.order.id.slice(0, 8).toUpperCase()} has been placed.
                            </p>
                          </div>
                        )}

                        {payment.status === "REJECTED" && (
                          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-sm text-red-800 dark:text-red-200">
                              <XCircle className="h-3.5 w-3.5 inline mr-1" />
                              Payment rejected{payment.rejectionReason ? `: ${payment.rejectionReason}` : ". Please contact vendor or re-submit payment."}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setIsPaymentDialogOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                          {payment.status === "VERIFIED" && payment.order && (
                            <Button
                              size="sm"
                              onClick={() => {
                                const order = orders.find(o => o.id === payment.order!.id);
                                if (order) {
                                  openOrderDetails(order);
                                } else {
                                  setActiveTab("orders");
                                }
                              }}
                            >
                              View Order
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== ORDER DETAIL DIALOG ===== */}
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
                  {selectedOrder.items?.map((item) => (
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
            {selectedOrder?.status === "DELIVERED" && (
              <Button
                variant="default"
                onClick={() => {
                  openRatingDialog(selectedOrder);
                  closeDialog();
                }}
              >
                <Star className="h-4 w-4 mr-2" />
                Rate Vendor
              </Button>
            )}
            <Button variant="outline" onClick={closeDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== PAYMENT DETAIL DIALOG ===== */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Payment Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment ID:</span>
                    <span className="font-mono">{selectedPayment.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    {getPaymentStatusBadge(selectedPayment.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted:</span>
                    <span>{formatDate(selectedPayment.createdAt)}</span>
                  </div>
                  {selectedPayment.verifiedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verified:</span>
                      <span>{formatDate(selectedPayment.verifiedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Vendor</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedPayment.vendor.name}</span>
                </div>
              </div>

              {selectedPayment.deliveryAddress && (
                <div>
                  <h3 className="font-semibold mb-2">Delivery Address</h3>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{selectedPayment.deliveryAddress}</span>
                  </div>
                </div>
              )}

              {selectedPayment.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedPayment.notes}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Payment Screenshot</h3>
                <div className="border rounded-lg p-2">
                  <img
                    src={selectedPayment.screenshotUrl}
                    alt="Payment screenshot"
                    className="max-h-64 mx-auto rounded-md object-contain"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-3">
                  {((selectedPayment.items || []) as PaymentItem[]).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          x{item.qty} × {formatPrice(item.priceSnapshot)}
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
                    {formatPrice(selectedPayment.totalAmount)}
                  </span>
                </div>
              </div>

              {selectedPayment.status === "PENDING" && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Pending Verification:</strong> The vendor is reviewing your payment screenshot. You will be notified once they verify it.
                  </p>
                </div>
              )}

              {selectedPayment.status === "VERIFIED" && selectedPayment.order && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Payment Verified!</strong> Order #{selectedPayment.order.id.slice(0, 8).toUpperCase()} has been created automatically.
                  </p>
                </div>
              )}

              {selectedPayment.status === "REJECTED" && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Payment Rejected:</strong> {selectedPayment.rejectionReason || "The vendor rejected this payment. Please contact the vendor or re-submit."}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {orderToRate && (
        <VendorRatingDialog
          orderId={orderToRate.id}
          vendorName={orderToRate.vendor.name}
          open={isRatingDialogOpen}
          onOpenChange={setIsRatingDialogOpen}
          onSuccess={handleRatingSuccess}
        />
      )}
    </div>
  );
}
