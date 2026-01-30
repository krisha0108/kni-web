"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageUpload } from "@/components/ui/image-upload";

interface Booking {
  id: string;
  status: string;
  totalAmount: number;
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

interface PaymentSettings {
  qrCodeImageUrl: string;
  upiId: string;
  accountHolderName: string;
  instructions: string;
}

export default function PaymentUploadPage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch booking and payment settings in parallel
        const [bookingRes, settingsRes] = await Promise.all([
          fetch("/api/owner/bookings/" + bookingId),
          fetch("/api/public/payment-settings"),
        ]);

        const bookingData = await bookingRes.json();
        const settingsData = await settingsRes.json();

        if (bookingData.ok) {
          setBooking(bookingData.data);
        } else {
          toast({ title: "Error", description: bookingData.error, variant: "destructive" });
          router.push("/owner/bookings");
          return;
        }

        if (settingsData.ok) {
          setPaymentSettings(settingsData.data);
        } else {
          toast({
            title: "Warning",
            description: "Payment settings not configured. Please contact admin.",
            variant: "destructive"
          });
        }
      } catch {
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [bookingId]);

  const handleSubmitPayment = async () => {
    if (!uploadedImageUrl || uploadedImageUrl.trim() === "") {
      toast({
        title: "Payment Proof Required",
        description: "Please upload a payment screenshot before submitting. The order will only be placed after you provide payment proof.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/owner/bookings/" + bookingId + "/upload-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshotUrl: uploadedImageUrl }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Payment proof uploaded successfully. Your booking will be verified by admin."
        });
        router.push("/owner/bookings/" + bookingId);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to upload payment proof", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const alreadyUploaded = booking.status !== "SLOT_SELECTED";

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/owner/bookings")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Bookings
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Upload Payment Proof</h1>
        <p className="text-muted-foreground">
          Upload a screenshot of your payment to complete the booking
        </p>
      </div>

      <Alert>
        <AlertDescription className="font-medium">
          ⚠️ Payment proof screenshot is required. Your booking will only be placed after you upload the payment proof and admin verifies it.
        </AlertDescription>
      </Alert>

      {!paymentSettings && (
        <Alert variant="destructive">
          <AlertDescription>
            Payment settings are not configured. Please contact the administrator.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Scan the QR code with any UPI app to make payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {paymentSettings ? (
              <>
                {/* QR Code Display */}
                <div className="flex justify-center p-6 bg-muted/50 rounded-lg">
                  <img
                    src={paymentSettings.qrCodeImageUrl}
                    alt="Payment QR Code"
                    className="w-64 h-64 border-2 border-border rounded-lg object-contain bg-white"
                  />
                </div>

                {/* Payment Info */}
                <div className="space-y-3">
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">UPI ID</span>
                      <span className="font-medium font-mono">{paymentSettings.upiId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-medium">{paymentSettings.accountHolderName}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Amount to Pay</span>
                      <span className="text-primary">{formatPrice(booking.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Instructions */}
                {paymentSettings.instructions && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Payment Instructions:</h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                      {paymentSettings.instructions}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center py-12">
                <p className="text-muted-foreground">Payment details not available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Payment Screenshot (Required)</CardTitle>
            <CardDescription>
              {alreadyUploaded
                ? "Payment proof has already been uploaded"
                : "Upload a clear screenshot of your payment confirmation to place your order"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alreadyUploaded ? (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">Payment Uploaded</p>
                <p className="text-sm text-muted-foreground">
                  Status: {booking.paymentProof?.status || booking.status}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => router.push("/owner/bookings/" + bookingId)}
                >
                  View Booking
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Payment Screenshot *</Label>
                  <ImageUpload
                    value={uploadedImageUrl}
                    onChange={(url) => setUploadedImageUrl(url)}
                    folder="payment-proofs"
                    label="Upload Payment Screenshot"
                    disabled={isUploading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload a clear screenshot of your payment confirmation
                  </p>
                </div>

                {!uploadedImageUrl && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Please upload a payment screenshot above to enable submission
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full"
                  onClick={handleSubmitPayment}
                  disabled={!uploadedImageUrl || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting Payment Proof...
                    </>
                  ) : (
                    "Submit Payment Proof & Place Order"
                  )}
                </Button>

                {uploadedImageUrl && (
                  <p className="text-sm text-muted-foreground text-center">
                    By submitting, your booking will be placed and sent for admin verification
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
