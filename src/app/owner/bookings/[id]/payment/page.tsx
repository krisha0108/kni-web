"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, CheckCircle, Image as ImageIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";

interface Booking {
  id: string;
  status: string;
  totalAmount: number;
  restaurant: { name: string };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    serviceItem?: { name: string };
    partItem?: { name: string };
  }>;
  paymentProof?: { id: string; imageUrl: string; status: string };
}

export default function PaymentUploadPage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/owner/bookings/" + bookingId);
        const data = await response.json();
        if (data.ok) {
          setBooking(data.data);
        } else {
          toast({ title: "Error", description: data.error, variant: "destructive" });
          router.push("/owner/bookings");
        }
      } catch {
        toast({ title: "Error", description: "Failed to load booking", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/owner/bookings/" + bookingId + "/upload-payment", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Payment proof uploaded successfully" });
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
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const alreadyUploaded = booking.status !== "PENDING_PAYMENT";

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>Transfer the amount to the following account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank Name</span>
                <span className="font-medium">State Bank of India</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Name</span>
                <span className="font-medium">KNI Services Pvt Ltd</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number</span>
                <span className="font-medium font-mono">1234567890123456</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IFSC Code</span>
                <span className="font-medium font-mono">SBIN0001234</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Amount to Pay</span>
                <span className="text-primary">{formatPrice(booking.totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Screenshot</CardTitle>
            <CardDescription>
              {alreadyUploaded
                ? "Payment proof has already been uploaded"
                : "Upload a clear screenshot of your payment confirmation"}
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
                  <Label htmlFor="file">Payment Screenshot *</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    {previewUrl ? (
                      <div className="space-y-4">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded"
                        />
                        <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                        <Button variant="outline" onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="space-y-2">
                          <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG or WebP (max 5MB)
                          </p>
                        </div>
                        <Input
                          id="file"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? (
                    "Uploading..."
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Payment Proof
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
