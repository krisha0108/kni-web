"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Upload, Image as ImageIcon, CheckCircle, X, ArrowLeft,
  CreditCard, FileText, AlertCircle, Loader2
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function PaymentUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const bookingId = searchParams.get("bookingId");
  const amount = searchParams.get("amount");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file (JPG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a payment screenshot",
        variant: "destructive",
      });
      return;
    }

    if (!bookingId) {
      toast({
        title: "Missing Booking ID",
        description: "Please go back and try again",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("paymentProof", selectedFile);
      if (transactionId) {
        formData.append("transactionId", transactionId);
      }

      const response = await fetch(`/api/owner/bookings/${bookingId}/payment`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Payment proof uploaded successfully. We will verify it shortly.",
        });
        router.push(`/owner/bookings/${bookingId}`);
      } else {
        toast({
          title: "Upload Failed",
          description: data.error || "Failed to upload payment proof",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "An error occurred while uploading",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6" />
          Upload Payment Proof
        </h1>
        <p className="text-muted-foreground">
          Upload a screenshot of your payment for verification
        </p>
      </div>

      {/* Amount Summary */}
      {amount && (
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount to Pay</p>
                  <p className="text-2xl font-bold text-primary">{formatPrice(parseInt(amount))}</p>
                </div>
              </div>
              <Badge variant="outline">Booking #{bookingId?.slice(0, 8)}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Payment Screenshot
          </CardTitle>
          <CardDescription>
            Upload a clear screenshot showing the payment transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!previewUrl ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">Drop image here or click to upload</p>
              <p className="text-sm text-muted-foreground">
                Supports JPG, PNG, WEBP (Max 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={previewUrl}
                  alt="Payment proof preview"
                  className="w-full max-h-96 object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={clearFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{selectedFile?.name}</span>
                <span>({(selectedFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction ID */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction Details (Optional)</CardTitle>
          <CardDescription>
            Add your transaction ID for faster verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction / Reference ID</Label>
            <Input
              id="transactionId"
              placeholder="e.g., UTR123456789"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Verification Process</p>
              <ul className="list-disc list-inside text-blue-700 mt-2 space-y-1">
                <li>Payments are verified within 2-4 hours</li>
                <li>You will be notified once verified</li>
                <li>Ensure the screenshot shows the transaction amount clearly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Submit Payment Proof
          </>
        )}
      </Button>
    </div>
  );
}