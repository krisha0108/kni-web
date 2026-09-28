"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatPrice } from "@/lib/utils";
import { Package, Store, MapPin, Calendar, Phone, Building2, Star, CreditCard, Clock, CheckCircle2, XCircle, Image as ImageIcon, Truck, ShoppingCart, ClipboardCheck, Cog, Ban, Upload, FileDown } from "lucide-react";
import { useRestaurant } from "@/contexts/restaurant-context";
import { VendorRatingDialog } from "@/components/ratings/vendor-rating-dialog";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface OrderItem {
  id: string;
  qty: number;
  priceSnapshot: number;
  product: {
    id: string;
    name: string;
    unit: string;
    deliveryTime?: string;
  };
}

type OrderStatus = "PLACED" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

interface StatusHistoryItem {
  id: string;
  oldStatus: OrderStatus | null;
  newStatus: OrderStatus;
  notes: string | null;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  statusNotes?: string;
  cancellationReason?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  statusUpdatedAt?: string;
  vendor: {
    id: string;
    name: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
  items: OrderItem[];
  statusHistory?: StatusHistoryItem[];
  pendingFinalPayment?: { id: string; totalAmount: number } | null;
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
  orderId: string | null;
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
  const [isPayingFinal, setIsPayingFinal] = useState(false);
  const payFinalInProgress = useRef(false);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

  const userRole = selectedRestaurant?.role;
  const canCreate = userRole === "OWNER" || userRole === "MANAGER";

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/owner/marketplace/orders?restaurantId=${selectedRestaurant.restaurantId}&page=${page}&pageSize=20`);
      const data = await response.json();

      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setOrders(Array.isArray(items) ? items : []);
        setTotalPages(Math.ceil(total / 20) || 1);
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
        setPayments(data.data?.items || data.data || []);
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
  }, [selectedRestaurant, page]);

  // Auto-refresh orders and payments every 60 seconds when tab is visible
  useEffect(() => {
    if (!selectedRestaurant) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        // Silent refresh - don't show loading spinners
        fetch(`/api/owner/marketplace/orders?restaurantId=${selectedRestaurant.restaurantId}`)
          .then(res => res.json())
          .then(data => { if (data.ok) setOrders(data.data?.items || data.data || []); })
          .catch(() => {
            toast({ title: "Error", description: "Failed to refresh orders", variant: "destructive" });
          });
        fetch(`/api/owner/marketplace/payments?restaurantId=${selectedRestaurant.restaurantId}`)
          .then(res => res.json())
          .then(data => { if (data.ok) setPayments(data.data?.items || data.data || []); })
          .catch(() => {
            toast({ title: "Error", description: "Failed to refresh payments", variant: "destructive" });
          });
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [selectedRestaurant]);

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedOrder(null);
  };

  const handlePayFinal = async (order: Order) => {
    if (!order.pendingFinalPayment || payFinalInProgress.current) return;
    payFinalInProgress.current = true;
    setIsPayingFinal(true);

    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MARKETPLACE_INSTALLMENT",
          installmentType: "FINAL",
          referenceId: order.pendingFinalPayment.id,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.ok) {
        toast({ title: "Error", description: orderData.error || "Failed to start payment", variant: "destructive" });
        setIsPayingFinal(false);
        payFinalInProgress.current = false;
        return;
      }

      const { orderId: razorpayOrderId, amount, currency, keyId, prefill } = orderData.data;
      const paymentId = order.pendingFinalPayment.id;

      const options = {
        key: keyId,
        amount,
        currency,
        name: "KNI Official Store",
        description: `Final payment - Order #${order.orderNumber ?? order.id.substring(0, 8)}`,
        order_id: razorpayOrderId,
        prefill: prefill || {},
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "MARKETPLACE_INSTALLMENT",
                installmentType: "FINAL",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                marketplacePaymentId: paymentId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.ok) {
              toast({ title: "Success", description: "Final payment successful! Order fully paid." });
              closeDialog();
              fetchOrders();
            } else {
              toast({ title: "Verification Failed", description: verifyData.error, variant: "destructive" });
            }
          } catch {
            toast({ title: "Error", description: "Payment verification failed", variant: "destructive" });
          }
          setIsPayingFinal(false);
          payFinalInProgress.current = false;
        },
        modal: {
          ondismiss: () => {
            setIsPayingFinal(false);
            payFinalInProgress.current = false;
          },
        },
        theme: { color: "#EF3A3A" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Payment was not completed",
          variant: "destructive",
        });
        setIsPayingFinal(false);
        payFinalInProgress.current = false;
      });
      rzp.open();
    } catch {
      toast({ title: "Error", description: "Failed to start payment", variant: "destructive" });
      setIsPayingFinal(false);
      payFinalInProgress.current = false;
    }
  };

  const openRatingDialog = (order: Order) => {
    setOrderToRate(order);
    setIsRatingDialogOpen(true);
  };

  const openPaymentDetails = (payment: Payment) => {
    console.log('Opening payment details:', payment);
    console.log('Screenshot URL:', payment.screenshotUrl);
    setSelectedPayment(payment);
    setIsPaymentDialogOpen(true);
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

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
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
                          Order #{order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}
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
                        {order.status === "DELIVERED" && canCreate && (
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

                        {payment.status === "VERIFIED" && payment.orderId && (
                          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                              Payment verified! Order #{orders.find((o) => o.id === payment.orderId)?.orderNumber ?? payment.orderId.slice(0, 8).toUpperCase()} has been placed.
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
                            onClick={() => openPaymentDetails(payment)}
                          >
                            View Details
                          </Button>
                          {payment.status === "VERIFIED" && payment.orderId && (
                            <Button
                              size="sm"
                              onClick={() => {
                                const order = orders.find(o => o.id === payment.orderId);
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

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4 p-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}

      {/* ===== ORDER DETAIL DIALOG ===== */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>

          {selectedOrder && (() => {
            const isCancelled = selectedOrder.status === "CANCELLED";
            // Find linked payment for this order
            const linkedPayment = payments.find(p => p.orderId === selectedOrder.id);

            // 6-step timeline: Payment Submitted → Verified → Confirmed → Processing → Shipped → Delivered
            const FULL_STEPS = [
              { key: "PAYMENT_SUBMITTED", label: "Payment Submitted", icon: Upload },
              { key: "PAYMENT_VERIFIED", label: "Payment Verified", icon: CheckCircle2 },
              { key: "CONFIRMED", label: "Order Confirmed", icon: ClipboardCheck },
              { key: "PROCESSING", label: "Processing", icon: Cog },
              { key: "SHIPPED", label: "Shipped", icon: Truck },
              { key: "DELIVERED", label: "Delivered", icon: CheckCircle2 },
            ];

            let currentStep = -1;
            const isRejected = linkedPayment?.status === "REJECTED";
            if (linkedPayment) {
              if (linkedPayment.status === "PENDING") currentStep = 0;
              else if (linkedPayment.status === "REJECTED") currentStep = 0;
              else if (linkedPayment.status === "VERIFIED") {
                const orderStepMap: Record<string, number> = { PLACED: 2, CONFIRMED: 2, PROCESSING: 3, SHIPPED: 4, DELIVERED: 5 };
                currentStep = orderStepMap[selectedOrder.status] ?? 2;
              }
            } else {
              // Legacy order without payment
              const orderStepMap: Record<string, number> = { PLACED: 2, CONFIRMED: 2, PROCESSING: 3, SHIPPED: 4, DELIVERED: 5 };
              currentStep = orderStepMap[selectedOrder.status] ?? 2;
            }

            return (
            <div className="space-y-6">
              {/* Order Info */}
              <div>
                <h3 className="font-semibold mb-2">Order Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="font-mono text-xs">{selectedOrder.orderNumber ?? selectedOrder.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Date:</span>
                    <span>{formatDate(selectedOrder.createdAt)}</span>
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
                      <span className="text-green-600 font-medium">{formatDate(selectedOrder.actualDeliveryDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Rejected Warning */}
              {isRejected && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Payment Rejected</p>
                      <p className="text-xs text-red-600 mt-1">{linkedPayment?.rejectionReason || "Please re-upload payment screenshot"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 7-Step Progress Timeline */}
              {!isCancelled && (
                <div>
                  <h3 className="font-semibold mb-3">Order Journey</h3>
                  <div className="space-y-0 ml-1">
                    {FULL_STEPS.map((step, idx) => {
                      const isCompleted = !isCancelled && !isRejected && currentStep > idx;
                      const isCurrent = !isCancelled && !isRejected && currentStep === idx;
                      const isLast = idx === FULL_STEPS.length - 1;
                      const StepIcon = step.icon;
                      return (
                        <div key={step.key} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              isCompleted ? "bg-green-500 border-green-500 text-white" :
                              isCurrent ? "bg-white border-primary text-primary border-[3px]" :
                              "bg-gray-50 border-gray-200 text-gray-400"
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <StepIcon className="h-3.5 w-3.5" />
                              )}
                            </div>
                            {!isLast && (
                              <div className={`w-0.5 flex-1 min-h-[28px] ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />
                            )}
                          </div>
                          <div className="pb-4">
                            <span className={`text-sm font-medium ${
                              isCompleted ? "text-green-600" :
                              isCurrent ? "text-primary font-bold" :
                              "text-gray-400"
                            }`}>{step.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cancelled with reason */}
              {isCancelled && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Ban className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-900 dark:text-red-100">Order Cancelled</span>
                  </div>
                  {selectedOrder.cancellationReason && (
                    <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                      Reason: {selectedOrder.cancellationReason}
                    </p>
                  )}
                </div>
              )}

              {/* Status Notes */}
              {selectedOrder.statusNotes && !isCancelled && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Vendor Note:</strong> {selectedOrder.statusNotes}
                  </p>
                </div>
              )}

              {/* Vendor & Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Vendor</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOrder.vendor.name}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Delivery Address</h3>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="font-medium">{selectedOrder.restaurant.name}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.qty} {item.product.unit} × {formatPrice(item.priceSnapshot)}
                        </p>
                        {item.product.deliveryTime && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            Delivery: {item.product.deliveryTime}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold">{formatPrice(item.qty * item.priceSnapshot)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold">{formatPrice(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Final payment due (negotiated/split-payment orders) */}
              {selectedOrder.pendingFinalPayment && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-orange-900">Final Payment Due</span>
                    <span className="text-xl font-bold text-orange-900">
                      {formatPrice(selectedOrder.pendingFinalPayment.totalAmount)}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handlePayFinal(selectedOrder)}
                    disabled={isPayingFinal}
                  >
                    {isPayingFinal ? "Processing..." : `Pay ${formatPrice(selectedOrder.pendingFinalPayment.totalAmount)} with Razorpay`}
                  </Button>
                </div>
              )}

              {/* Status History Timeline */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Status History</h3>
                  <div className="space-y-0">
                    {selectedOrder.statusHistory.map((entry, idx) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${idx === selectedOrder.statusHistory!.length - 1 ? "bg-primary" : "bg-green-500"}`} />
                          {idx < selectedOrder.statusHistory!.length - 1 && (
                            <div className="w-0.5 h-full min-h-[24px] bg-gray-200" />
                          )}
                        </div>
                        <div className="pb-3">
                          <div className="flex items-center gap-2">
                            {entry.oldStatus && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{entry.oldStatus}</Badge>
                            )}
                            {entry.oldStatus && <span className="text-xs text-muted-foreground">→</span>}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{entry.newStatus}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.createdAt)}</p>
                          {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          <DialogFooter>
            {["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(selectedOrder?.status || "") && (
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`/api/owner/marketplace/orders/${selectedOrder?.id}/invoice`, "_blank");
                }}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Invoice
              </Button>
            )}
            {selectedOrder?.status === "DELIVERED" && canCreate && (
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
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
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Screenshot
                </h3>
                {selectedPayment.screenshotUrl ? (
                  <div className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <img
                      src={selectedPayment.screenshotUrl}
                      alt="Payment screenshot"
                      className="max-h-96 w-full mx-auto rounded-md object-contain cursor-pointer"
                      onClick={() => window.open(selectedPayment.screenshotUrl, '_blank')}
                      onError={(e) => {
                        console.error('Failed to load screenshot:', selectedPayment.screenshotUrl);
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex flex-col items-center justify-center py-8 text-red-500">
                              <svg class="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <p class="text-sm font-medium">Failed to load screenshot</p>
                              <p class="text-xs text-gray-500 mt-1">The image may have been deleted or the URL is invalid</p>
                            </div>
                          `;
                        }
                      }}
                      onLoad={() => console.log('Screenshot loaded successfully')}
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                    <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 font-medium">No payment screenshot available</p>
                    <p className="text-xs text-gray-400 mt-1">The screenshot may not have been uploaded</p>
                  </div>
                )}
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

              {selectedPayment.status === "VERIFIED" && selectedPayment.orderId && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Payment Verified!</strong> Order #{orders.find((o) => o.id === selectedPayment.orderId)?.orderNumber ?? selectedPayment.orderId.slice(0, 8).toUpperCase()} has been created automatically.
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