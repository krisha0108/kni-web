"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, Loader2, CreditCard } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Booking {
  id: string;
  status: string;
  totalAmount: number;
  gstAmount: number;
  tipAmount: number;
  restaurant: { name: string };
  items: Array<{
    id: string;
    qty: number;
    priceSnapshot: number;
    serviceItem?: { name: string };
    partItem?: { name: string };
  }>;
  paymentProof?: { id: string; screenshotUrl: string; status: string };
}

export default function PaymentUploadPage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [razorpaySuccess, setRazorpaySuccess] = useState(false);
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const bookingRes = await fetch("/api/owner/bookings/" + bookingId);
        const bookingData = await bookingRes.json();

        if (bookingData.ok) {
          setBooking(bookingData.data);
        } else {
          toast({ title: "Error", description: bookingData.error, variant: "destructive" });
          router.push("/owner/bookings");
        }
      } catch {
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [bookingId]);

  // totalAmount already includes GST + tip from backend
  const totalPayable = booking ? booking.totalAmount : 0;

  // ==================== RAZORPAY PAYMENT ====================
  const handleRazorpayPayment = async () => {
    if (!booking) return;
    setIsProcessingRazorpay(true);

    try {
      // 1. Create Razorpay order
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalPayable,
          type: "SERVICE_BOOKING",
          referenceId: booking.id,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.ok) {
        toast({ title: "Error", description: orderData.error || "Failed to create order", variant: "destructive" });
        setIsProcessingRazorpay(false);
        return;
      }

      const { orderId, amount, currency, keyId, prefill } = orderData.data;

      // 2. Open Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: "KNI Super App",
        description: `Service Booking - ${booking.restaurant.name}`,
        order_id: orderId,
        prefill: prefill || {},
        handler: async (response: any) => {
          // 3. Verify payment
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "SERVICE_BOOKING",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: booking.id,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.ok) {
              setRazorpaySuccess(true);
            } else {
              toast({ title: "Verification Failed", description: verifyData.error, variant: "destructive" });
            }
          } catch {
            toast({ title: "Error", description: "Payment verification failed", variant: "destructive" });
          }
          setIsProcessingRazorpay(false);
        },
        modal: {
          ondismiss: () => {
            setIsProcessingRazorpay(false);
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
        setIsProcessingRazorpay(false);
      });
      rzp.open();
    } catch {
      toast({ title: "Error", description: "Failed to initiate payment", variant: "destructive" });
      setIsProcessingRazorpay(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) return null;

  // ==================== RAZORPAY SUCCESS ====================
  if (razorpaySuccess) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/owner/bookings")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bookings
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 px-8">
            <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-sm text-muted-foreground text-center mb-2">
              Your payment of <span className="font-bold text-foreground">{formatPrice(totalPayable)}</span> via Razorpay has been verified.
            </p>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Your booking is now confirmed. An engineer will be assigned shortly.
            </p>
            <Button className="w-full max-w-xs" onClick={() => router.push("/owner/bookings/" + bookingId)}>
              View Booking Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/owner/bookings")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Bookings
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Complete Payment</h1>
        <p className="text-muted-foreground">
          {booking.restaurant.name} — {formatPrice(totalPayable)}
        </p>
      </div>

      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {booking.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium">{item.serviceItem?.name || item.partItem?.name}</span>
                <span className="text-sm text-muted-foreground">x{item.qty}</span>
              </div>
              <span className="text-sm font-semibold">{formatPrice(item.priceSnapshot * item.qty)}</span>
            </div>
          ))}
          <div className="pt-3 border-t space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(booking.totalAmount)}</span>
            </div>
            {booking.gstAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>GST (18%)</span>
                <span>{formatPrice(booking.gstAmount)}</span>
              </div>
            )}
            {booking.tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tip</span>
                <span>{formatPrice(booking.tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatPrice(totalPayable)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {booking.paymentProof?.status === "VERIFIED" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Payment Already Verified</p>
            <Badge variant="success" className="mt-1">VERIFIED</Badge>
            <Button className="mt-4" onClick={() => router.push("/owner/bookings/" + bookingId)}>
              View Booking
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Secure Payment via Razorpay</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pay using UPI, Credit/Debit Card, NetBanking, or Wallets.
                  Your booking will be confirmed instantly.
                </p>
              </div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-red-50 border border-red-100 w-full">
                <span className="text-sm font-medium text-red-700">Amount to Pay</span>
                <span className="text-xl font-bold text-red-700">{formatPrice(totalPayable)}</span>
              </div>
              <Button
                className="w-full h-12 text-base"
                onClick={handleRazorpayPayment}
                disabled={isProcessingRazorpay}
              >
                {isProcessingRazorpay ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pay {formatPrice(totalPayable)} with Razorpay
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
