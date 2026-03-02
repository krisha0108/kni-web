"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Receipt,
  QrCode,
  Info,
  ArrowRight,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useRestaurant } from "@/contexts/restaurant-context";
import type { VendorPaymentInfo } from "../types";

interface CheckoutItem {
  product: { id: string; name: string; price: number };
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CheckoutSession {
  vendorId: string;
  vendorName: string;
  isAdminStore: boolean;
  items: CheckoutItem[];
  restaurantId: string;
  deliveryAddress: string;
  deliveryNotes: string;
}

export default function MarketplacePaymentPage() {
  const searchParams = useSearchParams();
  const vendorIdParam = searchParams.get("vendorId");
  const router = useRouter();
  const { toast } = useToast();
  const { selectedRestaurant } = useRestaurant();

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [vendorPaymentInfo, setVendorPaymentInfo] = useState<VendorPaymentInfo | null>(null);
  const [loadingPaymentInfo, setLoadingPaymentInfo] = useState(true);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-submission states
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "VERIFIED" | "REJECTED" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Load checkout session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("marketplace_checkout_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.vendorId === vendorIdParam) {
          setSession(parsed);
        } else {
          toast({ title: "Error", description: "Checkout session expired", variant: "destructive" });
          router.push("/owner/marketplace/cart");
        }
      } else {
        toast({ title: "Error", description: "No checkout session found", variant: "destructive" });
        router.push("/owner/marketplace/cart");
      }
    } catch {
      router.push("/owner/marketplace/cart");
    }
  }, [vendorIdParam]);

  // Fetch vendor payment info (QR + UPI)
  useEffect(() => {
    if (!vendorIdParam) return;
    const fetchPaymentInfo = async () => {
      setLoadingPaymentInfo(true);
      try {
        const response = await fetch(`/api/owner/marketplace/vendor-payment-info?vendorId=${vendorIdParam}`);
        const data = await response.json();
        if (data.ok) {
          setVendorPaymentInfo(data.data);
        } else {
          setVendorPaymentInfo(null);
        }
      } catch {
        setVendorPaymentInfo(null);
      } finally {
        setLoadingPaymentInfo(false);
      }
    };
    fetchPaymentInfo();
  }, [vendorIdParam]);

  // Poll for payment status after submission (every 10 seconds, matching mobile)
  const checkPaymentStatus = useCallback(async () => {
    if (!session || !paymentId) return;
    try {
      const response = await fetch(
        `/api/owner/marketplace/payments?restaurantId=${session.restaurantId}`
      );
      const data = await response.json();
      if (data.ok) {
        const payment = data.data.find((p: any) => p.id === paymentId);
        if (payment) {
          setPaymentStatus(payment.status);
          if (payment.status === "REJECTED") {
            setRejectionReason(payment.rejectionReason || "");
          }
        }
      }
    } catch {
      // ignore
    }
  }, [session, paymentId]);

  useEffect(() => {
    if (!paymentSubmitted || !paymentId || paymentStatus !== "PENDING") return;
    const interval = setInterval(checkPaymentStatus, 10000);
    return () => clearInterval(interval);
  }, [paymentSubmitted, paymentId, paymentStatus, checkPaymentStatus]);

  const totalAmount = session
    ? session.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : 0;

  // Submit payment
  const handleSubmitPayment = async () => {
    if (!session || !screenshotUrl) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/owner/marketplace/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: session.restaurantId,
          vendorId: session.vendorId,
          items: session.items.map((item) => ({
            productId: item.product?.id || item.productId,
            qty: item.quantity,
          })),
          screenshotUrl,
          deliveryAddress: session.deliveryAddress || undefined,
          notes: session.deliveryNotes || undefined,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        // Save paid vendor ID so cart/marketplace can remove items (matching mobile pattern)
        localStorage.setItem("marketplace_paid_vendor", session.vendorId);
        // Clean up checkout session
        localStorage.removeItem("marketplace_checkout_session");
        setPaymentSubmitted(true);
        setPaymentId(data.data.id);
        setPaymentStatus("PENDING");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit payment",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to submit payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for re-upload (on rejection)
  const handleResubmit = () => {
    setPaymentSubmitted(false);
    setPaymentId(null);
    setPaymentStatus(null);
    setRejectionReason("");
    setScreenshotUrl("");
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ==================== PAYMENT STATUS SCREEN (after submission) ====================
  if (paymentSubmitted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/owner/marketplace")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Payment Status</h1>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 px-8">
            {/* PENDING */}
            {paymentStatus === "PENDING" && (
              <>
                <div className="w-24 h-24 rounded-full bg-yellow-50 flex items-center justify-center mb-6">
                  <Clock className="h-12 w-12 text-yellow-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">Payment Pending Verification</h2>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Your payment screenshot has been sent to {session.isAdminStore ? "KNI Official Store" : session.vendorName}.
                  They will verify it shortly.
                </p>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 w-full max-w-md mb-6">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Once verified, your order will be automatically created. You&apos;ll receive a notification.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Checking status...</span>
                </div>
              </>
            )}

            {/* VERIFIED */}
            {paymentStatus === "VERIFIED" && (
              <>
                <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">Payment Verified!</h2>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Your order has been placed successfully. The vendor will process it soon.
                </p>
                <Button className="w-full max-w-xs" onClick={() => router.push("/owner/marketplace/orders")}>
                  <Receipt className="mr-2 h-4 w-4" />
                  View My Orders
                </Button>
              </>
            )}

            {/* REJECTED */}
            {paymentStatus === "REJECTED" && (
              <>
                <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">Payment Rejected</h2>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {session.isAdminStore ? "KNI Official Store" : session.vendorName} has rejected your payment.
                </p>
                {rejectionReason && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 w-full max-w-md mb-6">
                    <p className="text-sm font-semibold text-red-700 mb-1">Reason:</p>
                    <p className="text-sm text-red-600">{rejectionReason}</p>
                  </div>
                )}
                <Button className="w-full max-w-xs" onClick={handleResubmit}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-upload Screenshot
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => router.push("/owner/marketplace")}
            >
              Back to Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== MAIN PAYMENT VIEW ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Pay & Order</h1>
          <p className="text-sm text-muted-foreground">
            {session.isAdminStore ? "KNI Official Store" : session.vendorName}
          </p>
        </div>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {session.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{item.name}</span>
                <span className="text-sm text-muted-foreground flex-shrink-0">x{item.quantity}</span>
              </div>
              <span className="text-sm font-semibold ml-4">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-3 border-t">
            <span className="font-bold">Total Amount</span>
            <span className="text-xl font-bold text-primary">{formatPrice(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details (QR + UPI) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPaymentInfo ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading payment details...</span>
            </div>
          ) : !vendorPaymentInfo ? (
            <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-yellow-50 border border-yellow-200">
              <Clock className="h-8 w-8 text-yellow-500" />
              <p className="text-sm text-center text-yellow-700">
                Vendor has not set up payment details yet. Please contact them directly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Code */}
              {vendorPaymentInfo.paymentQrCodeUrl && (
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Scan QR Code to Pay</p>
                  <img
                    src={vendorPaymentInfo.paymentQrCodeUrl}
                    alt="Payment QR Code"
                    className="max-w-[200px] h-auto rounded-lg border"
                  />
                </div>
              )}

              {/* UPI ID */}
              {vendorPaymentInfo.paymentUpiId && (
                <div className={vendorPaymentInfo.paymentQrCodeUrl ? "pt-4 border-t" : ""}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">UPI ID</p>
                  <div className="flex items-center bg-muted/50 rounded-lg px-4 py-3">
                    <span className="font-mono font-bold text-sm flex-1">{vendorPaymentInfo.paymentUpiId}</span>
                  </div>
                </div>
              )}

              {/* Account Name */}
              {vendorPaymentInfo.paymentAccountName && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Account Name</p>
                  <p className="text-sm font-medium">{vendorPaymentInfo.paymentAccountName}</p>
                </div>
              )}

              {/* No payment details at all */}
              {!vendorPaymentInfo.paymentQrCodeUrl && !vendorPaymentInfo.paymentUpiId && (
                <p className="text-sm text-yellow-600">
                  This vendor has not set up payment details yet. Please contact them directly.
                </p>
              )}

              {/* Amount Highlight */}
              <div className="flex justify-between items-center p-4 rounded-lg bg-red-50 border border-red-100">
                <span className="text-sm font-medium text-red-700">Amount to Pay</span>
                <span className="text-xl font-bold text-red-700">{formatPrice(totalAmount)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screenshot Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Upload Payment Screenshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Payment Screenshot *</Label>
            <ImageUpload
              value={screenshotUrl}
              onChange={setScreenshotUrl}
              folder="marketplace-payments"
              label="Upload Payment Screenshot"
              maxSizeMB={5}
            />
            <p className="text-xs text-muted-foreground">
              Take a screenshot of your payment confirmation and upload it here
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        className="w-full h-12 text-base"
        onClick={handleSubmitPayment}
        disabled={isSubmitting || !screenshotUrl}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Submit Payment
          </>
        )}
      </Button>
    </div>
  );
}
