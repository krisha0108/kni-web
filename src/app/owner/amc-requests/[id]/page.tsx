"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { ArrowLeft, Shield, Loader2, Trash2, Calendar, MapPin, Wrench, ClipboardCheck, FileText, CheckCircle, XCircle, ExternalLink, IndianRupee, QrCode, Upload, AlertCircle } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";

interface AMCRequestDetail {
  id: string;
  status: string;
  equipmentCategories: string[];
  kitchenType: string;
  planType: string;
  visitFrequency: string;
  preferredStartDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: { id: string; name: string; city: string; address: string };
  survey?: {
    id: string;
    status: string;
    scheduledDate: string;
    completedDate: string | null;
    overallCondition: string | null;
    engineer: { name: string };
  } | null;
  proposal?: {
    id: string;
    status: string;
    coveredEquipment: any;
    preventiveVisits: number;
    freeBreakdownVisits: number;
    responseTimeSLA: string | null;
    resolutionTimeSLA: string | null;
    exclusions: any;
    sparePartsPolicy: string | null;
    monthlyPrice: number;
    quarterlyPrice: number | null;
    annualPrice: number | null;
    contractPeriod: string;
    sentAt: string | null;
    contract?: {
      id: string;
      contractNumber: string;
      status: string;
    } | null;
  } | null;
  payment?: {
    id: string;
    paymentType: string;
    amount: number;
    screenshotUrl: string | null;
    status: string;
    rejectionReason: string | null;
  } | null;
}

interface PaymentSettings {
  qrCodeImageUrl: string;
  upiId: string;
  accountHolderName: string;
  instructions: string | null;
}

const statusLabels: Record<string, string> = {
  REQUESTED: "Requested",
  SURVEY_SCHEDULED: "Survey Scheduled",
  SURVEY_COMPLETED: "Survey Completed",
  PROPOSAL_SENT: "Proposal Sent",
  PROPOSAL_ACCEPTED: "Proposal Accepted",
  PROPOSAL_REJECTED: "Proposal Rejected",
  PAYMENT_PENDING: "Payment Pending",
  PAYMENT_UPLOADED: "Payment Uploaded",
  CONTRACT_ACTIVE: "Contract Active",
  CANCELLED: "Cancelled",
};

const statusColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  REQUESTED: "warning",
  SURVEY_SCHEDULED: "default",
  SURVEY_COMPLETED: "secondary",
  PROPOSAL_SENT: "default",
  PROPOSAL_ACCEPTED: "success",
  PROPOSAL_REJECTED: "destructive",
  PAYMENT_PENDING: "warning",
  PAYMENT_UPLOADED: "default",
  CONTRACT_ACTIVE: "success",
  CANCELLED: "destructive",
};

const planLabels: Record<string, string> = { BASIC: "Basic", STANDARD: "Standard", PREMIUM: "Premium" };
const planColors: Record<string, string> = {
  BASIC: "bg-green-100 text-green-800",
  STANDARD: "bg-blue-100 text-blue-800",
  PREMIUM: "bg-purple-100 text-purple-800",
};
const frequencyLabels: Record<string, string> = { MONTHLY: "Monthly", BI_MONTHLY: "Bi-Monthly", QUARTERLY: "Quarterly" };
const kitchenLabels: Record<string, string> = {
  CLOUD_KITCHEN: "Cloud Kitchen", QSR: "QSR", FINE_DINE: "Fine Dine",
  HOTEL: "Hotel", CAFE: "Cafe", CATERING: "Catering",
};

const statusFlow = [
  "REQUESTED",
  "SURVEY_SCHEDULED",
  "SURVEY_COMPLETED",
  "PROPOSAL_SENT",
  "PAYMENT_PENDING",
  "PAYMENT_UPLOADED",
  "CONTRACT_ACTIVE",
];

export default function OwnerAMCRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [request, setRequest] = useState<AMCRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Payment states
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const fetchRequest = () => {
    fetch(`/api/owner/amc-requests/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setRequest(data.data);
        else toast({ title: "Error", description: data.error || "Not found", variant: "destructive" });
      })
      .catch(() => toast({ title: "Error", description: "Failed to load", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchRequest(); }, [id]);

  // Fetch payment settings when payment is needed
  useEffect(() => {
    if (request && (request.status === "PAYMENT_PENDING" || request.status === "PAYMENT_UPLOADED")) {
      fetch("/api/public/payment-settings")
        .then((r) => r.json())
        .then((d) => d.ok && setPaymentSettings(d.data))
        .catch(() => {});
    }
  }, [request?.status]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/owner/amc-requests/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "AMC request cancelled" });
        router.push("/owner/amc-requests");
      } else {
        toast({ title: "Error", description: data.error || "Failed to cancel", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to cancel", variant: "destructive" });
    } finally {
      setIsCancelling(false);
      setShowCancel(false);
    }
  };

  const handleAcceptProposal = async () => {
    if (!request?.proposal) return;
    setIsAccepting(true);
    try {
      const res = await fetch(`/api/owner/amc-proposals/${request.proposal.id}/accept`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Proposal Accepted!", description: "Please complete the payment to activate your contract." });
        fetchRequest();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to accept", variant: "destructive" });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!request?.proposal || !rejectReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason for rejection", variant: "destructive" });
      return;
    }
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/owner/amc-proposals/${request.proposal.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Proposal Rejected", description: "Admin will be notified" });
        setShowReject(false);
        setRejectReason("");
        fetchRequest();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleUploadScreenshot = async () => {
    if (!request?.payment || !screenshotUrl) {
      toast({ title: "Error", description: "Please upload payment screenshot", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const res = await fetch(`/api/owner/amc-payment/${request.payment.id}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshotUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Screenshot Uploaded!", description: "Admin will verify your payment shortly." });
        setScreenshotUrl("");
        fetchRequest();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to upload", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!request) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">AMC request not found</p>
          <Button className="mt-4" onClick={() => router.push("/owner/amc-requests")}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  const currentStepIndex = statusFlow.indexOf(request.status);
  const isCancelled = request.status === "CANCELLED";
  const isRejected = request.status === "PROPOSAL_REJECTED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/owner/amc-requests")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            AMC Request
          </h1>
          <p className="text-muted-foreground text-sm">
            {request.restaurant.name} - {formatDate(request.createdAt)}
          </p>
        </div>
        {request.status === "REQUESTED" && (
          <Button variant="destructive" size="sm" onClick={() => setShowCancel(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Cancel Request
          </Button>
        )}
      </div>

      {/* Status Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Status</span>
            <Badge variant={statusColors[request.status] || "default"} className="text-sm">
              {statusLabels[request.status] || request.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isCancelled && !isRejected ? (
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {statusFlow.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step} className="flex items-center gap-1 min-w-fit">
                    <div
                      className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        isCompleted
                          ? "bg-green-100 text-green-800"
                          : isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {statusLabels[step]}
                    </div>
                    {idx < statusFlow.length - 1 && (
                      <div className={`w-4 h-0.5 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isCancelled ? "This request has been cancelled." : "The proposal was rejected. Awaiting a revised proposal."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Restaurant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{request.restaurant.name}</p>
            <p className="text-sm text-muted-foreground">{request.restaurant.address}</p>
            <p className="text-sm text-muted-foreground">{request.restaurant.city}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              AMC Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Plan Type</span>
              <Badge className={planColors[request.planType] || ""}>
                {planLabels[request.planType] || request.planType}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Visit Frequency</span>
              <span className="font-medium text-sm">{frequencyLabels[request.visitFrequency] || request.visitFrequency}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Kitchen Type</span>
              <span className="font-medium text-sm">{kitchenLabels[request.kitchenType] || request.kitchenType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Preferred Start</span>
              <span className="font-medium text-sm">{formatDate(request.preferredStartDate)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Equipment Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(request.equipmentCategories) &&
              request.equipmentCategories.map((cat: string) => (
                <Badge key={cat} variant="outline" className="py-1.5 px-3">{cat}</Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {request.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Additional Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{request.notes}</p></CardContent>
        </Card>
      )}

      {/* Survey Info */}
      {request.survey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Site Survey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Engineer:</span>{" "}
                <span className="font-medium">{request.survey.engineer.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <Badge variant={request.survey.status === "COMPLETED" ? "success" : "warning"} className="ml-1">
                  {request.survey.status}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Scheduled:</span>{" "}
                <span className="font-medium">{formatDate(request.survey.scheduledDate)}</span>
              </div>
              {request.survey.completedDate && (
                <div>
                  <span className="text-muted-foreground">Completed:</span>{" "}
                  <span className="font-medium">{formatDate(request.survey.completedDate)}</span>
                </div>
              )}
            </div>
            {request.survey.overallCondition && (
              <div className="pt-2 border-t">
                <span className="text-sm text-muted-foreground">Overall Condition: </span>
                <Badge variant={
                  request.survey.overallCondition === "GOOD" ? "success" :
                  request.survey.overallCondition === "FAIR" ? "warning" : "destructive"
                }>
                  {request.survey.overallCondition}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Proposal Card */}
      {request.proposal && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                AMC Proposal
              </span>
              <Badge variant={
                request.proposal.status === "SENT" ? "warning" :
                request.proposal.status === "ACCEPTED" ? "success" :
                request.proposal.status === "REJECTED" ? "destructive" : "default"
              }>
                {request.proposal.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Pricing */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Pricing</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{formatPrice(request.proposal.monthlyPrice)}</p>
                  <p className="text-xs text-blue-600">Per Month</p>
                </div>
                {request.proposal.quarterlyPrice && (
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-green-700">{formatPrice(request.proposal.quarterlyPrice)}</p>
                    <p className="text-xs text-green-600">Per Quarter</p>
                  </div>
                )}
                {request.proposal.annualPrice && (
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-purple-700">{formatPrice(request.proposal.annualPrice)}</p>
                    <p className="text-xs text-purple-600">Per Year</p>
                  </div>
                )}
              </div>
            </div>

            {/* Coverage Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preventive Visits</span>
                  <span className="font-semibold">{request.proposal.preventiveVisits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Free Breakdowns</span>
                  <span className="font-semibold">{request.proposal.freeBreakdownVisits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract Period</span>
                  <span className="font-semibold">{request.proposal.contractPeriod}</span>
                </div>
              </div>
              <div className="space-y-2">
                {request.proposal.responseTimeSLA && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response SLA</span>
                    <span className="font-semibold">{request.proposal.responseTimeSLA}</span>
                  </div>
                )}
                {request.proposal.resolutionTimeSLA && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolution SLA</span>
                    <span className="font-semibold">{request.proposal.resolutionTimeSLA}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Covered Equipment */}
            {request.proposal.coveredEquipment && Array.isArray(request.proposal.coveredEquipment) && request.proposal.coveredEquipment.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Covered Equipment</h4>
                <div className="flex flex-wrap gap-2">
                  {request.proposal.coveredEquipment.map((eq: string, i: number) => (
                    <Badge key={i} variant="outline" className="py-1">{eq}</Badge>
                  ))}
                </div>
              </div>
            )}

            {request.proposal.sparePartsPolicy && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Spare Parts Policy</h4>
                <p className="text-sm text-muted-foreground">{request.proposal.sparePartsPolicy}</p>
              </div>
            )}

            {request.proposal.exclusions && Array.isArray(request.proposal.exclusions) && request.proposal.exclusions.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Exclusions</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {request.proposal.exclusions.map((ex: string, i: number) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Accept / Reject Buttons */}
            {request.proposal.status === "SENT" && (
              <div className="flex gap-3 pt-4 border-t">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleAcceptProposal} disabled={isAccepting}>
                  {isAccepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Accept Proposal
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => setShowReject(true)} disabled={isAccepting}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Proposal
                </Button>
              </div>
            )}

            {/* Contract Link */}
            {request.proposal.contract && (
              <div className="pt-4 border-t">
                <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-800">Contract Created</p>
                    <p className="text-sm text-green-600">{request.proposal.contract.contractNumber} - {request.proposal.contract.status}</p>
                  </div>
                  <Button size="sm" onClick={() => router.push(`/owner/amc-contracts/${request.proposal!.contract!.id}`)}>
                    <ExternalLink className="mr-2 h-4 w-4" /> View Contract
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Section */}
      {request.payment && (request.status === "PAYMENT_PENDING" || request.status === "PAYMENT_UPLOADED") && (
        <Card className="border-2 border-orange-300">
          <CardHeader className="bg-orange-50">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Payment
              </span>
              <Badge variant={
                request.payment.status === "PENDING" ? "warning" :
                request.payment.status === "UPLOADED" ? "default" :
                request.payment.status === "VERIFIED" ? "success" :
                "destructive"
              }>
                {request.payment.status === "PENDING" ? "Awaiting Payment" :
                 request.payment.status === "UPLOADED" ? "Verifying..." :
                 request.payment.status === "REJECTED" ? "Rejected" : request.payment.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Amount to pay */}
            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Amount to Pay</p>
              <p className="text-3xl font-bold text-primary">{formatPrice(request.payment.amount)}</p>
            </div>

            {/* Rejection reason */}
            {request.payment.status === "REJECTED" && request.payment.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700 text-sm">Payment Rejected</p>
                    <p className="text-sm text-red-600">{request.payment.rejectionReason}</p>
                    <p className="text-xs text-red-500 mt-1">Please re-upload a valid screenshot.</p>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code and Payment Details */}
            {(request.payment.status === "PENDING" || request.payment.status === "REJECTED") && paymentSettings && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* QR Code */}
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
                  {/* UPI Details */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-muted-foreground text-xs">UPI ID</Label>
                      <p className="font-mono font-medium text-lg bg-muted p-2 rounded select-all">{paymentSettings.upiId}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Account Holder</Label>
                      <p className="font-medium">{paymentSettings.accountHolderName}</p>
                    </div>
                    {paymentSettings.instructions && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Instructions</Label>
                        <p className="text-sm text-muted-foreground">{paymentSettings.instructions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Screenshot */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Payment Screenshot
                  </h4>
                  <ImageUpload
                    value={screenshotUrl}
                    onChange={setScreenshotUrl}
                    label="Payment Screenshot"
                  />
                  <Button
                    className="w-full mt-3"
                    onClick={handleUploadScreenshot}
                    disabled={!screenshotUrl || isUploading}
                  >
                    {isUploading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" /> Submit Payment Screenshot</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Uploaded - waiting verification */}
            {request.payment.status === "UPLOADED" && (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="font-medium text-green-700">Payment screenshot submitted successfully!</p>
                <p className="text-sm text-muted-foreground mt-1">Admin will verify your payment. You will be notified once verified.</p>
                {request.payment.screenshotUrl && (
                  <div className="mt-3 border rounded-lg p-2 inline-block">
                    <img src={request.payment.screenshotUrl} alt="Payment Screenshot" className="max-w-[200px] rounded" />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel AMC Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this AMC request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>No, Keep It</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={isCancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isCancelling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</> : "Yes, Cancel Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Proposal Dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Proposal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this proposal. The admin will review and may send a revised proposal.
            </p>
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Pricing is too high, need more breakdown visits, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)} disabled={isRejecting}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectProposal} disabled={isRejecting}>
              {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Reject Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
