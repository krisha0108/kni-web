"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { Loader2, CheckCircle, XCircle, Eye, CreditCard, User, MapPin } from "lucide-react";

interface PaymentItem {
  productId: string;
  qty: number;
  priceSnapshot: number;
  name: string;
}

interface Payment {
  id: string;
  totalAmount: number;
  items: PaymentItem[];
  screenshotUrl: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason?: string;
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
  verifiedAt?: string;
  owner: { id: string; name: string; phone?: string; email?: string };
  restaurant: { id: string; name: string; city: string; address: string };
  order?: { id: string; status: string } | null;
}

export default function AdminStorePaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState("PENDING");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/my-store/payments?status=${tab}`);
      const data = await response.json();
      if (data.ok) {
        setPayments(data.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load payments", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [tab]);

  const handleVerify = async (paymentId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/my-store/payments/${paymentId}/verify`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Verified", description: "Payment verified and order created successfully" });
        setIsViewOpen(false);
        setSelectedPayment(null);
        fetchPayments();
      } else {
        toast({ title: "Error", description: data.error || "Failed to verify", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to verify payment", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !rejectReason.trim()) {
      toast({ title: "Error", description: "Please provide a rejection reason", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/my-store/payments/${selectedPayment.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Rejected", description: "Payment rejected" });
        setIsRejectOpen(false);
        setIsViewOpen(false);
        setSelectedPayment(null);
        setRejectReason("");
        fetchPayments();
      } else {
        toast({ title: "Error", description: data.error || "Failed to reject", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to reject payment", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case "VERIFIED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Verified</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Store Payments</h1>
        <p className="text-muted-foreground">
          Review and verify payment screenshots from restaurant owners for KNI Official Store orders
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="VERIFIED">Verified</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No {tab.toLowerCase()} payments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{payment.owner.name}</span>
                          {statusBadge(payment.status)}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {payment.restaurant.name}, {payment.restaurant.city}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {(payment.items as PaymentItem[]).length} items &middot; {formatPrice(payment.totalAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleDateString("en-US", {
                            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                        {payment.rejectionReason && (
                          <p className="text-sm text-red-600">Reason: {payment.rejectionReason}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedPayment(payment); setIsViewOpen(true); }}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                        {payment.status === "PENDING" && (
                          <>
                            <Button size="sm" onClick={() => handleVerify(payment.id)} disabled={isSubmitting}>
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Verify
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => { setSelectedPayment(payment); setIsRejectOpen(true); }}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Payment Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto w-[95vw] sm:w-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              From {selectedPayment?.owner.name} for {selectedPayment?.restaurant.name}
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div>
                <h4 className="font-medium mb-2">Customer</h4>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>{selectedPayment.owner.name}</span>
                  </div>
                  {selectedPayment.owner.phone && (
                    <p className="text-muted-foreground ml-5">{selectedPayment.owner.phone}</p>
                  )}
                  {selectedPayment.owner.email && (
                    <p className="text-muted-foreground ml-5">{selectedPayment.owner.email}</p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="space-y-1">
                  {(selectedPayment.items as PaymentItem[]).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name} x{item.qty}</span>
                      <span>{formatPrice(item.priceSnapshot * item.qty)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatPrice(selectedPayment.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {selectedPayment.deliveryAddress && (
                <div>
                  <h4 className="font-medium mb-1">Delivery Address</h4>
                  <p className="text-sm text-muted-foreground">{selectedPayment.deliveryAddress}</p>
                </div>
              )}

              {selectedPayment.notes && (
                <div>
                  <h4 className="font-medium mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedPayment.notes}</p>
                </div>
              )}

              {/* Screenshot */}
              <div>
                <h4 className="font-medium mb-2">Payment Screenshot</h4>
                <img
                  src={selectedPayment.screenshotUrl}
                  alt="Payment screenshot"
                  className="max-w-full h-auto max-h-96 rounded-lg border"
                />
              </div>

              {selectedPayment.status === "PENDING" && (
                <DialogFooter className="gap-2">
                  <Button variant="destructive" onClick={() => setIsRejectOpen(true)} disabled={isSubmitting}>
                    <XCircle className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                  <Button onClick={() => handleVerify(selectedPayment.id)} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-1 h-4 w-4" />
                    )}
                    Verify Payment
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this payment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Screenshot unclear, amount doesn't match, payment not received..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting || !rejectReason.trim()}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-1 h-4 w-4" />
              )}
              Reject Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}