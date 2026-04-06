"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  Clock,
  XCircle,
  CheckCircle,
  AlertCircle,
  Send,
  Upload,
  Loader2,
  QrCode,
  CreditCard,
} from "lucide-react";

interface SubscriptionRequest {
  id: string;
  durationMonths: number;
  status: string;
  price: number | null;
  screenshotUrl: string | null;
  rejectionReason: string | null;
  adminNote: string | null;
  activeUntil: string | null;
  createdAt: string;
}

interface PaymentSettings {
  qrCodeImageUrl: string;
  upiId: string;
  accountHolderName: string;
  instructions: string | null;
}

interface SubscriptionFlowProps {
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  activeUntil: string | null;
  latestRequest: SubscriptionRequest | null;
  revenueModel?: string;
  commissionRate?: number | null;
}

const DURATION_OPTIONS = [
  { value: 1, label: "1 Month" },
  { value: 2, label: "2 Months" },
  { value: 3, label: "3 Months" },
  { value: 6, label: "6 Months" },
  { value: 12, label: "12 Months" },
];

export function SubscriptionFlow({
  subscriptionStatus,
  trialEndsAt,
  activeUntil,
  latestRequest: initialRequest,
  revenueModel,
  commissionRate,
}: SubscriptionFlowProps) {
  const [latestRequest, setLatestRequest] = useState<SubscriptionRequest | null>(initialRequest);
  const [selectedDuration, setSelectedDuration] = useState<number>(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();

  // Determine if subscription is expired
  const isExpired = (() => {
    if (subscriptionStatus === "EXPIRED") return true;
    if (subscriptionStatus === "TRIAL" && trialEndsAt) {
      return new Date(trialEndsAt) <= new Date();
    }
    if (subscriptionStatus === "ACTIVE" && activeUntil) {
      return new Date(activeUntil) <= new Date();
    }
    if (!subscriptionStatus) return true;
    return false;
  })();

  const isBlocked = subscriptionStatus === "BLOCKED";

  // Check if subscription is active (not expired)
  const isActive = (() => {
    if (subscriptionStatus === "TRIAL" && trialEndsAt) {
      return new Date(trialEndsAt) > new Date();
    }
    if (subscriptionStatus === "ACTIVE" && activeUntil) {
      return new Date(activeUntil) > new Date();
    }
    return false;
  })();

  const daysLeft = (() => {
    const endDate = subscriptionStatus === "TRIAL" ? trialEndsAt : activeUntil;
    if (!endDate) return 0;
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  })();


  const handleRequestSubscription = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/vendor/subscription/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMonths: selectedDuration }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setLatestRequest(data.data);
      toast({ title: "Success", description: "Subscription request submitted!" });
    } catch {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!latestRequest || isProcessingPayment) return;
    setIsProcessingPayment(true);
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: latestRequest.price,
          type: "VENDOR_SUBSCRIPTION",
          referenceId: latestRequest.id,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.ok) {
        toast({ title: "Error", description: orderData.error, variant: "destructive" });
        setIsProcessingPayment(false);
        return;
      }

      const { orderId, amount, currency, keyId, prefill } = orderData.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: "KNI Super App",
        description: `Subscription - ${latestRequest.durationMonths} months`,
        order_id: orderId,
        prefill: prefill || {},
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "VENDOR_SUBSCRIPTION",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                subscriptionRequestId: latestRequest.id,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.ok) {
              toast({ title: "Subscription Activated!", description: "Your subscription is now active." });
              setLatestRequest((prev) => prev ? { ...prev, status: "ACTIVATED" } : prev);
            } else {
              toast({ title: "Verification Failed", description: verifyData.error, variant: "destructive" });
            }
          } catch {
            toast({ title: "Error", description: "Payment verification failed", variant: "destructive" });
          }
          setIsProcessingPayment(false);
        },
        modal: { ondismiss: () => { setIsProcessingPayment(false); } },
        theme: { color: "#EF3A3A" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        toast({ title: "Payment Failed", description: resp.error?.description || "Payment not completed", variant: "destructive" });
        setIsProcessingPayment(false);
      });
      rzp.open();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to process payment", variant: "destructive" });
      setIsProcessingPayment(false);
    }
  };

  // Determine what to show based on state
  const requestStatus = latestRequest?.status;
  const showActiveSubscription = isActive && (!requestStatus || requestStatus === "ACTIVATED");
  const showExpiredNoRequest = isExpired && !isBlocked && (!requestStatus || requestStatus === "ACTIVATED");
  const showRequestedState = requestStatus === "REQUESTED";
  const showPriceSentState = requestStatus === "PRICE_SENT";
  const showPaymentUploadedState = requestStatus === "PAYMENT_UPLOADED";
  const showPaymentRejectedState = requestStatus === "PAYMENT_REJECTED";

  // Commission model vendors don't need subscription
  if (revenueModel === "COMMISSION") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Revenue Model</h1>
          <p className="text-muted-foreground">Your vendor account revenue model</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Commission Model
            </CardTitle>
            <CardDescription>
              You are on the Commission model. The platform takes {commissionRate}% commission on each delivered order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Model:</span>
              <Badge variant="success">Commission {commissionRate}%</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              No subscription fees required. Your products are always visible in the marketplace.
              Commission is calculated automatically when orders are delivered.
            </p>
            <Button variant="outline" asChild>
              <a href="/vendor/commission">View Commission Details</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Subscription</h1>
        <p className="text-muted-foreground">Manage your vendor subscription</p>
      </div>

      {/* Current Subscription Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isActive ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : isBlocked ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : isExpired ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
            Subscription Status
          </CardTitle>
          <CardDescription>
            {isActive
              ? `Your subscription is active until ${formatDate(
                  subscriptionStatus === "TRIAL" ? trialEndsAt! : activeUntil!
                )}`
              : isBlocked
              ? "Your account has been blocked. Please contact support."
              : isExpired
              ? "Your subscription has expired."
              : "Waiting for subscription activation."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <Badge
              variant={
                isActive
                  ? "success"
                  : isBlocked
                  ? "destructive"
                  : isExpired
                  ? "destructive"
                  : "secondary"
              }
            >
              {isActive
                ? subscriptionStatus === "TRIAL"
                  ? "Trial Period"
                  : "Active"
                : isBlocked
                ? "Blocked"
                : isExpired
                ? "Expired"
                : "Pending"}
            </Badge>
          </div>

          {daysLeft > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Days Remaining:</span>
              <span className="text-2xl font-bold">{daysLeft}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Alert */}
      {isBlocked && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Account Blocked</AlertTitle>
          <AlertDescription>
            Your account has been blocked. Please contact support for assistance.
          </AlertDescription>
        </Alert>
      )}

      {/* Active Subscription — trial warning */}
      {isActive && subscriptionStatus === "TRIAL" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Trial Period</AlertTitle>
          <AlertDescription>
            You are on a trial period. Your trial ends on{" "}
            {formatDate(trialEndsAt!)}. Request a subscription before it expires.
          </AlertDescription>
        </Alert>
      )}

      {/* ── State: Expired, No Active Request → Show duration picker ── */}
      {showExpiredNoRequest && (
        <Card className="border-2 border-orange-300">
          <CardHeader className="bg-orange-50">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Request Subscription
            </CardTitle>
            <CardDescription>
              Select a subscription duration and submit your request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                Your products are no longer visible in the marketplace. Request a subscription to get back online.
              </AlertDescription>
            </Alert>

            <div>
              <Label className="text-sm font-medium">Select Duration</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {DURATION_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={selectedDuration === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDuration(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleRequestSubscription}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Request {selectedDuration} Month Subscription
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── State: REQUESTED → Waiting for admin ── */}
      {showRequestedState && (
        <Card>
          <CardContent className="py-8 text-center">
            <Clock className="h-10 w-10 mx-auto text-yellow-500 mb-3" />
            <h3 className="font-semibold text-lg">Request Submitted</h3>
            <p className="text-muted-foreground mt-1">
              You requested a {latestRequest!.durationMonths} month subscription on{" "}
              {formatDate(latestRequest!.createdAt)}.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Waiting for admin to set the price. You will be notified.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── State: PRICE_SENT → Show price + Razorpay payment ── */}
      {showPriceSentState && (
        <Card className="border-2 border-orange-300">
          <CardHeader className="bg-orange-50">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment
              </span>
              <Badge variant="warning">Awaiting Payment</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Amount */}
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-red-700">Amount to Pay</span>
                <p className="text-xs text-muted-foreground">for {latestRequest!.durationMonths} month(s)</p>
              </div>
              <span className="text-2xl font-bold text-red-700">
                {formatPrice(latestRequest!.price)}
              </span>
            </div>

            {latestRequest!.adminNote && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Note from admin:</strong> {latestRequest!.adminNote}
                </p>
              </div>
            )}

            {/* Razorpay Payment */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Secure Payment via Razorpay</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pay using UPI, Credit/Debit Card, NetBanking, or Wallets.
                  Your subscription will be activated instantly.
                </p>
              </div>
              <Button
                className="w-full h-12 text-base"
                onClick={handleRazorpayPayment}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="mr-2 h-5 w-5" /> Pay {formatPrice(latestRequest!.price)} with Razorpay</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── State: PAYMENT_UPLOADED → Under review ── */}
      {showPaymentUploadedState && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-3" />
            <h3 className="font-semibold text-lg">Payment Screenshot Submitted</h3>
            <p className="text-muted-foreground mt-1">
              Admin will verify your payment. You will be notified once verified.
            </p>
            {latestRequest!.screenshotUrl && (
              <div className="mt-4 border rounded-lg p-2 inline-block">
                <img
                  src={latestRequest!.screenshotUrl}
                  alt="Payment Screenshot"
                  className="max-w-[200px] rounded"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── State: PAYMENT_REJECTED → Show reason + Razorpay retry ── */}
      {showPaymentRejectedState && (
        <Card className="border-2 border-red-300">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment
              </span>
              <Badge variant="destructive">Rejected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-red-700">Amount to Pay</span>
                <p className="text-xs text-muted-foreground">for {latestRequest!.durationMonths} month(s)</p>
              </div>
              <span className="text-2xl font-bold text-red-700">{formatPrice(latestRequest!.price)}</span>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 text-sm">Payment Rejected</p>
                  <p className="text-sm text-red-600">{latestRequest!.rejectionReason}</p>
                  <p className="text-xs text-red-500 mt-1">Please retry payment via Razorpay.</p>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-12 text-base"
              onClick={handleRazorpayPayment}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
              ) : (
                <><CreditCard className="mr-2 h-5 w-5" /> Retry Payment with Razorpay</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active subscription (show when ACTIVATED or active) */}
      {showActiveSubscription && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Subscription Active</AlertTitle>
          <AlertDescription>
            Your subscription is active. Your products are visible in the marketplace.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}