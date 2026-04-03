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
  CreditCard,
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

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  // ── Razorpay payment for commission ──────────────────────────────────────────

  const handleRazorpayPayment = async (collectionId: string, amount: number) => {
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type: "VENDOR_COMMISSION", referenceId: collectionId }),
      });
      const orderData = await orderRes.json();
      if (!orderData.ok) {
        toast({ title: "Error", description: orderData.error, variant: "destructive" });
        setIsProcessingPayment(false);
        return;
      }

      const { orderId, amount: rzpAmount, currency, keyId, prefill } = orderData.data;

      const options = {
        key: keyId,
        amount: rzpAmount,
        currency,
        name: "KNI Super App",
        description: "Commission Payment",
        order_id: orderId,
        prefill: prefill || {},
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "VENDOR_COMMISSION",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                collectionId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.ok) {
              toast({ title: "Payment Successful!", description: "Commission payment verified." });
              fetchData();
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
                <CreditCard className="h-4 w-4" />
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
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-red-700">Amount Due</span>
              <span className="text-2xl font-bold text-red-700">
                {formatPrice(activeCollection.totalAmount)}
              </span>
            </div>

            {/* Rejection Reason */}
            {activeCollection.status === "PAYMENT_REJECTED" && activeCollection.rejectionReason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Payment Rejected</AlertTitle>
                <AlertDescription>
                  {activeCollection.rejectionReason}
                  <p className="text-xs mt-1">Please retry payment.</p>
                </AlertDescription>
              </Alert>
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
                </p>
              </div>
              <Button
                className="w-full h-12 text-base"
                onClick={() => handleRazorpayPayment(activeCollection.id, activeCollection.totalAmount)}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="mr-2 h-5 w-5" /> Pay {formatPrice(activeCollection.totalAmount)} with Razorpay</>
                )}
              </Button>
            </div>

            {false && (
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