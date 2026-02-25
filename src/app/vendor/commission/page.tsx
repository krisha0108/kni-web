"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  QrCode,
  DollarSign,
  Percent,
  Wallet,
  BadgeCheck,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Commission {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  collectionId: string | null;
  createdAt: string;
  order: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  };
}

interface Collection {
  id: string;
  totalAmount: number;
  status: string;
  screenshotUrl: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

interface CommissionData {
  vendorProfile: {
    revenueModel: string;
    commissionRate: number | null;
  };
  commissions: Commission[];
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  collections: Collection[];
}

interface PaymentSettings {
  qrCodeImageUrl: string;
  upiId: string;
  accountHolderName: string;
  instructions: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function collectionStatusBadge(status: string) {
  switch (status) {
    case "REQUESTED":
      return <Badge variant="warning">Requested</Badge>;
    case "PAYMENT_REJECTED":
      return <Badge variant="destructive">Rejected</Badge>;
    case "PAYMENT_UPLOADED":
      return <Badge variant="secondary">Uploaded</Badge>;
    case "COMPLETED":
      return <Badge variant="success">Completed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ── Page Component ─────────────────────────────────────────────────────────────

export default function VendorCommissionPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // ── Fetch commission data ────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/vendor/commission");
      const json = await res.json();

      if (!json.ok) {
        setError(json.error || "Failed to load commission data");
        return;
      }

      const commissionData = json.data as CommissionData;

      // Redirect non-commission vendors
      if (commissionData.vendorProfile.revenueModel !== "COMMISSION") {
        router.replace("/vendor/subscription");
        return;
      }

      setData(commissionData);
    } catch {
      setError("Failed to load commission data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Fetch payment settings when there is an active collection ────────────────

  const activeCollection = data?.collections.find(
    (c) => c.status === "REQUESTED" || c.status === "PAYMENT_REJECTED"
  );

  useEffect(() => {
    if (activeCollection) {
      fetch("/api/public/payment-settings")
        .then((res) => res.json())
        .then((json) => {
          if (json.ok && json.data) {
            setPaymentSettings(json.data);
          }
        })
        .catch(console.error);
    }
  }, [activeCollection?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload payment screenshot ────────────────────────────────────────────────

  const handleUploadScreenshot = async (collectionId: string) => {
    if (!screenshotUrl) return;
    setIsUploading(true);
    try {
      const res = await fetch("/api/vendor/commission/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, screenshotUrl }),
      });
      const json = await res.json();

      if (!json.ok) {
        toast({ title: "Error", description: json.error, variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Payment screenshot uploaded!" });
      setScreenshotUrl("");
      // Refresh data to reflect updated status
      fetchData();
    } catch {
      toast({
        title: "Error",
        description: "Failed to upload screenshot",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">Loading commission data...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Commission</h1>
          <p className="text-muted-foreground">View your commission history and payments</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Something went wrong."}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={fetchData}>
          Try Again
        </Button>
      </div>
    );
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const { vendorProfile, commissions, totalCommission, pendingCommission, paidCommission, collections } = data;

  const uploadedCollection = collections.find((c) => c.status === "PAYMENT_UPLOADED");

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Commission</h1>
        <p className="text-muted-foreground">View your commission history and manage payments</p>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" />
              Commission Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vendorProfile.commissionRate ?? 0}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Total Commission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(totalCommission)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Pending (Unpaid)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatPrice(pendingCommission)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5" />
              Paid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatPrice(paidCommission)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Active Collection: REQUESTED or PAYMENT_REJECTED ────────────────── */}
      {activeCollection && (
        <Card className="border-2 border-orange-300">
          <CardHeader className="bg-orange-50">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Commission Payment
              </span>
              {activeCollection.status === "REQUESTED" ? (
                <Badge variant="warning">Awaiting Payment</Badge>
              ) : (
                <Badge variant="destructive">Rejected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Amount Due */}
            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-bold text-primary">
                {formatPrice(activeCollection.totalAmount)}
              </p>
            </div>

            {/* Rejection Reason */}
            {activeCollection.status === "PAYMENT_REJECTED" && activeCollection.rejectionReason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Payment Rejected</AlertTitle>
                <AlertDescription>
                  {activeCollection.rejectionReason}
                  <p className="text-xs mt-1">Please re-upload a valid payment screenshot.</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Payment Details (QR Code + UPI) */}
            {paymentSettings && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2">Scan QR Code to Pay</p>
                    <div className="border rounded-lg p-2 inline-block bg-white">
                      <img
                        src={paymentSettings.qrCodeImageUrl}
                        alt="Payment QR Code"
                        className="w-48 h-48 object-contain mx-auto"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-muted-foreground text-xs">UPI ID</Label>
                      <p className="font-mono font-medium text-lg bg-muted p-2 rounded select-all">
                        {paymentSettings.upiId}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Account Holder</Label>
                      <p className="font-medium">{paymentSettings.accountHolderName}</p>
                    </div>
                    {paymentSettings.instructions && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Instructions</Label>
                        <p className="text-sm text-muted-foreground">
                          {paymentSettings.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Screenshot */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {activeCollection.status === "PAYMENT_REJECTED"
                      ? "Re-upload Payment Screenshot"
                      : "Upload Payment Screenshot"}
                  </h4>
                  <ImageUpload
                    value={screenshotUrl}
                    onChange={setScreenshotUrl}
                    label="Payment Screenshot"
                  />
                  <Button
                    className="w-full mt-3"
                    onClick={() => handleUploadScreenshot(activeCollection.id)}
                    disabled={!screenshotUrl || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" /> Submit Payment Screenshot
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {!paymentSettings && (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading payment details...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Collection: PAYMENT_UPLOADED ────────────────────────────────────── */}
      {uploadedCollection && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-3" />
            <h3 className="font-semibold text-lg">Payment Submitted</h3>
            <p className="text-muted-foreground mt-1">
              Your payment of {formatPrice(uploadedCollection.totalAmount)} has been submitted
              and is awaiting verification.
            </p>
            {uploadedCollection.screenshotUrl && (
              <div className="mt-4 border rounded-lg p-2 inline-block">
                <img
                  src={uploadedCollection.screenshotUrl}
                  alt="Payment Screenshot"
                  className="max-w-[200px] rounded"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Commission Records Table ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Commission Records
          </CardTitle>
          <CardDescription>
            Details of commission charged on each order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No commission records yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Commission records will appear here once orders are delivered.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Order Amount</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      {c.orderId.slice(0, 8)}
                    </TableCell>
                    <TableCell>{formatPrice(c.orderAmount)}</TableCell>
                    <TableCell>{c.commissionRate}%</TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(c.commissionAmount)}
                    </TableCell>
                    <TableCell>{formatDate(c.createdAt)}</TableCell>
                    <TableCell>
                      {c.collectionId ? (
                        <Badge variant="success">Collected</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Collections History ──────────────────────────────────────────────── */}
      {collections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Collections History
            </CardTitle>
            <CardDescription>
              Past and ongoing commission collection requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((col) => (
                  <TableRow key={col.id}>
                    <TableCell className="font-mono text-xs">
                      {col.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(col.totalAmount)}
                    </TableCell>
                    <TableCell>{collectionStatusBadge(col.status)}</TableCell>
                    <TableCell>{formatDate(col.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
