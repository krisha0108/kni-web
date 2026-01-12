"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, CheckCircle2, Link as LinkIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PaymentSettings {
  qrCodeImageUrl: string;
  upiId: string;
  accountHolderName: string;
  instructions: string;
}

export default function PaymentSettingsPage() {
  const [formData, setFormData] = useState<PaymentSettings>({
    qrCodeImageUrl: "",
    upiId: "",
    accountHolderName: "",
    instructions: "",
  });
  const [currentQR, setCurrentQR] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/payment-settings");
      const data = await response.json();

      if (data.ok && data.data) {
        setFormData({
          qrCodeImageUrl: data.data.qrCodeImageUrl || "",
          upiId: data.data.upiId || "",
          accountHolderName: data.data.accountHolderName || "",
          instructions: data.data.instructions || "",
        });
        setCurrentQR(data.data.qrCodeImageUrl || "");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch payment settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate QR code URL
    if (!formData.qrCodeImageUrl) {
      toast({
        title: "Error",
        description: "Please upload a QR code image",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Payment settings updated successfully",
        });
        setCurrentQR(formData.qrCodeImageUrl);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Payment Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure UPI payment QR code and instructions for restaurant owners
        </p>
      </div>

      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          Restaurant owners will see this QR code when making payments. They will scan it with their UPI app,
          pay the booking amount, and upload a screenshot for verification.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>UPI Payment Configuration</CardTitle>
            <CardDescription>
              Set up your UPI QR code and payment instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code Image Upload or URL */}
            <div className="space-y-2">
              <Label>
                UPI QR Code Image *
              </Label>
              <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Enter URL
                  </TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="space-y-2">
                  <Input
                    type="text"
                    placeholder="https://example.com/qr-code.png or /uploads/payment-qr/image.jpg"
                    value={formData.qrCodeImageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, qrCodeImageUrl: e.target.value });
                      setCurrentQR(e.target.value);
                    }}
                    disabled={isSaving}
                  />
                  <p className="text-sm text-muted-foreground">
                    Paste image URL or local path (e.g., /uploads/payment-qr/..., /images/..., or full URL)
                  </p>
                  {formData.qrCodeImageUrl && (
                    <div className="border rounded-lg p-4">
                      <img
                        src={formData.qrCodeImageUrl}
                        alt="QR Code Preview"
                        className="max-w-full h-auto max-h-64 mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="upload">
                  <ImageUpload
                    value={formData.qrCodeImageUrl}
                    onChange={(url) => {
                      setFormData({ ...formData, qrCodeImageUrl: url });
                      setCurrentQR(url);
                    }}
                    folder="payment-qr"
                    label="Upload UPI QR Code"
                    aspectRatio="1/1"
                    disabled={isSaving}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload your UPI QR code image (requires Cloudinary configuration)
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* UPI ID */}
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID *</Label>
              <Input
                id="upiId"
                required
                value={formData.upiId}
                onChange={(e) =>
                  setFormData({ ...formData, upiId: e.target.value })
                }
                placeholder="merchant@paytm"
              />
              <p className="text-sm text-muted-foreground">
                Your UPI ID (e.g., yourname@paytm, businessname@upi)
              </p>
            </div>

            {/* Account Holder Name */}
            <div className="space-y-2">
              <Label htmlFor="accountHolderName">Account Holder Name *</Label>
              <Input
                id="accountHolderName"
                required
                value={formData.accountHolderName}
                onChange={(e) =>
                  setFormData({ ...formData, accountHolderName: e.target.value })
                }
                placeholder="KNI Super App Pvt Ltd"
              />
              <p className="text-sm text-muted-foreground">
                Business or account holder name shown on QR code
              </p>
            </div>

            {/* Payment Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">Payment Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) =>
                  setFormData({ ...formData, instructions: e.target.value })
                }
                placeholder="1. Scan the QR code with any UPI app&#10;2. Pay the exact amount shown&#10;3. Take a screenshot of the successful payment&#10;4. Upload the screenshot for verification"
                rows={6}
              />
              <p className="text-sm text-muted-foreground">
                Step-by-step instructions shown to customers during payment
              </p>
            </div>

            {/* Save Button */}
            <div className="flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={fetchSettings}
                disabled={isSaving}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Restaurant owner creates a booking and selects services/parts</li>
            <li>System shows total amount and displays your UPI QR code</li>
            <li>Owner scans QR code with any UPI app (PhonePe, GooglePay, Paytm, etc.)</li>
            <li>Owner pays the exact booking amount</li>
            <li>Owner uploads payment screenshot in the app</li>
            <li>You verify the payment in Admin Panel → Bookings</li>
            <li>After verification, engineer is assigned automatically</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
