"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Search, Loader2, Eye, ArrowRight, Calendar, FileText, IndianRupee, CheckCircle, XCircle, Plus } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";

interface AMCRequest {
  id: string;
  status: string;
  equipmentCategories: string[];
  kitchenType: string;
  planType: string;
  visitFrequency: string;
  preferredStartDate: string;
  notes: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string; phone: string };
  restaurant: { id: string; name: string; city: string; address: string };
  survey?: {
    id: string;
    status: string;
    scheduledDate: string;
    completedDate: string | null;
    overallCondition: string | null;
    specialNotes: string | null;
    equipmentList: any[];
    engineer: { name: string; phone: string } | null;
  };
  proposal?: {
    id: string;
    status: string;
    monthlyPrice: number;
    preventiveVisits: number;
    freeBreakdownVisits: number;
    contract?: { id: string; contractNumber: string; status: string } | null;
  };
  payment?: {
    id: string;
    paymentType: string;
    amount: number;
    screenshotUrl: string | null;
    status: string;
    rejectionReason: string | null;
  };
}

interface Engineer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

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

const planLabels: Record<string, string> = { BASIC: "Basic", STANDARD: "Standard", PREMIUM: "Premium" };
const planColors: Record<string, string> = { BASIC: "bg-green-100 text-green-800", STANDARD: "bg-blue-100 text-blue-800", PREMIUM: "bg-purple-100 text-purple-800" };
const frequencyLabels: Record<string, string> = { MONTHLY: "Monthly", BI_MONTHLY: "Bi-Monthly", QUARTERLY: "Quarterly" };
const kitchenLabels: Record<string, string> = { CLOUD_KITCHEN: "Cloud Kitchen", QSR: "QSR", FINE_DINE: "Fine Dine", HOTEL: "Hotel", CAFE: "Cafe", CATERING: "Catering", HOSPITAL: "Hospital", INDUSTRIES: "Industries", INSTITUTE: "Institute" };

export default function AdminAMCRequestsPage() {
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<AMCRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<AMCRequest | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Survey scheduling state
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [surveyEngineerId, setSurveyEngineerId] = useState("");
  const [surveyDate, setSurveyDate] = useState("");

  // Payment verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRejectPayment, setShowRejectPayment] = useState(false);
  const [paymentRejectReason, setPaymentRejectReason] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (searchQuery) params.set("search", searchQuery);
      const response = await fetch(`/api/admin/amc-requests?${params.toString()}`);
      const data = await response.json();
      if (data.ok) setRequests(data.data);
    } catch {
      toast({ title: "Error", description: "Failed to fetch AMC requests", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEngineers = async () => {
    try {
      const res = await fetch("/api/admin/engineers");
      const data = await res.json();
      if (data.ok) setEngineers(data.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchRequests();
    fetchEngineers();
  }, [filterStatus, searchQuery]);

  if (!mounted) return null;

  const handleStatusChange = async (id: string, newStatus: string) => {
    // If status is SURVEY_SCHEDULED, show survey form instead
    if (newStatus === "SURVEY_SCHEDULED") {
      setShowSurveyForm(true);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/amc-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: `Status updated to ${statusLabels[newStatus]}` });
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleScheduleSurvey = async () => {
    if (!selectedRequest || !surveyEngineerId || !surveyDate) {
      toast({ title: "Error", description: "Select engineer and date", variant: "destructive" });
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/amc-requests/${selectedRequest.id}/schedule-survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engineerId: surveyEngineerId, scheduledDate: surveyDate }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Survey scheduled successfully!" });
        setSelectedRequest(null);
        setShowSurveyForm(false);
        setSurveyEngineerId("");
        setSurveyDate("");
        fetchRequests();
      } else {
        toast({ title: "Error", description: data.error || "Failed to schedule", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to schedule survey", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/admin/amc-payment/${paymentId}/verify`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Payment Verified!", description: `Contract ${data.data.contractNumber} created successfully` });
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to verify", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!paymentRejectReason.trim()) {
      toast({ title: "Error", description: "Please provide rejection reason", variant: "destructive" });
      return;
    }
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/admin/amc-payment/${paymentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: paymentRejectReason }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Payment Rejected", description: "Owner will be notified to re-upload" });
        setShowRejectPayment(false);
        setPaymentRejectReason("");
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  // Valid status transitions - now "Schedule Survey" for REQUESTED is handled separately
  const getActions = (status: string) => {
    const actions: Record<string, { value: string; label: string; variant?: "default" | "destructive" }[]> = {
      REQUESTED: [
        { value: "SURVEY_SCHEDULED", label: "Schedule Survey" },
        { value: "CANCELLED", label: "Cancel", variant: "destructive" },
      ],
      SURVEY_SCHEDULED: [
        { value: "CANCELLED", label: "Cancel", variant: "destructive" },
      ],
      SURVEY_COMPLETED: [
        { value: "CREATE_PROPOSAL", label: "Create Proposal" },
        { value: "CANCELLED", label: "Cancel", variant: "destructive" },
      ],
      PROPOSAL_SENT: [
        { value: "PROPOSAL_ACCEPTED", label: "Mark Accepted" },
        { value: "PROPOSAL_REJECTED", label: "Mark Rejected", variant: "destructive" },
      ],
      PROPOSAL_REJECTED: [
        { value: "PROPOSAL_SENT", label: "Resend Proposal" },
        { value: "CANCELLED", label: "Cancel", variant: "destructive" },
      ],
    };
    return actions[status] || [];
  };

  const handleAction = (requestId: string, action: string) => {
    if (action === "CREATE_PROPOSAL") {
      router.push(`/admin/amc-proposals/create/${requestId}`);
      return;
    }
    handleStatusChange(requestId, action);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            AMC Requests
          </h1>
          <p className="text-muted-foreground">Manage Annual Maintenance Contract requests from owners</p>
        </div>
        <Button onClick={() => router.push("/admin/amc-requests/create")}>
          <Plus className="mr-2 h-4 w-4" /> Create AMC Request
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by restaurant, owner, or kitchen type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="SURVEY_SCHEDULED">Survey Scheduled</SelectItem>
                <SelectItem value="SURVEY_COMPLETED">Survey Completed</SelectItem>
                <SelectItem value="PROPOSAL_SENT">Proposal Sent</SelectItem>
                <SelectItem value="PROPOSAL_ACCEPTED">Proposal Accepted</SelectItem>
                <SelectItem value="PAYMENT_PENDING">Payment Pending</SelectItem>
                <SelectItem value="PAYMENT_UPLOADED">Payment Uploaded</SelectItem>
                <SelectItem value="CONTRACT_ACTIVE">Contract Active</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            Showing {requests.length} request{requests.length !== 1 ? "s" : ""}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-yellow-600">{requests.filter((r) => r.status === "REQUESTED").length}</p><p className="text-sm text-muted-foreground">New Requests</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-blue-600">{requests.filter((r) => ["SURVEY_SCHEDULED", "SURVEY_COMPLETED"].includes(r.status)).length}</p><p className="text-sm text-muted-foreground">In Survey</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-purple-600">{requests.filter((r) => r.status === "PROPOSAL_SENT").length}</p><p className="text-sm text-muted-foreground">Proposals Sent</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-green-600">{requests.filter((r) => ["PROPOSAL_ACCEPTED", "CONTRACT_ACTIVE"].includes(r.status)).length}</p><p className="text-sm text-muted-foreground">Accepted/Active</p></CardContent></Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card><CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /><p className="text-muted-foreground">Loading...</p></CardContent></Card>
      ) : requests.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><Shield className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-lg text-muted-foreground">No AMC requests found</p></CardContent></Card>
      ) : (
        <div className="border rounded-lg">
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                
                <TableHead className="hidden lg:table-cell">Kitchen</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.restaurant.name}<span className="block text-xs text-muted-foreground">{req.restaurant.city}</span></TableCell>
                  <TableCell className="hidden md:table-cell">{req.owner.name}<span className="block text-xs text-muted-foreground">{req.owner.phone}</span></TableCell>
                  <TableCell className="hidden lg:table-cell">{kitchenLabels[req.kitchenType] || req.kitchenType}</TableCell>
                  <TableCell><Badge className={planColors[req.planType] || ""}>{planLabels[req.planType] || req.planType}</Badge></TableCell>
                  
                  <TableCell className="hidden md:table-cell">{frequencyLabels[req.visitFrequency] || req.visitFrequency}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[req.status] || "default"}>{statusLabels[req.status] || req.status}</Badge>
                    {req.survey && req.status === "SURVEY_SCHEDULED" && req.survey.status === "IN_PROGRESS" && (
                      <span className="block text-xs text-blue-600 font-medium mt-1">Engineer Accepted</span>
                    )}
                    {req.survey && req.survey.status === "SCHEDULED" && req.status === "SURVEY_SCHEDULED" && (
                      <span className="block text-xs text-yellow-600 mt-1">Awaiting Accept</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(req.createdAt)}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => { setSelectedRequest(req); setShowSurveyForm(false); }}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
                  
                  
                
                
                
          
        </div>
      )}

      {/* Detail + Actions Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open) { setSelectedRequest(null); setShowSurveyForm(false); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>AMC Request Details</DialogTitle>
            <DialogDescription>View and manage this AMC request</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Status</Label>
                <Badge variant={statusColors[selectedRequest.status] || "default"} className="text-sm">{statusLabels[selectedRequest.status] || selectedRequest.status}</Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Restaurant</Label>
                <p className="font-medium">{selectedRequest.restaurant.name}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.restaurant.address}, {selectedRequest.restaurant.city}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Owner</Label>
                <p className="font-medium">{selectedRequest.owner.name}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.owner.email} | {selectedRequest.owner.phone}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Plan</Label><div className="mt-1"><Badge className={planColors[selectedRequest.planType] || ""}>{planLabels[selectedRequest.planType] || selectedRequest.planType}</Badge></div></div>
                <div><Label className="text-muted-foreground">Frequency</Label><p className="font-medium">{frequencyLabels[selectedRequest.visitFrequency] || selectedRequest.visitFrequency}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Kitchen Type</Label><p className="font-medium">{kitchenLabels[selectedRequest.kitchenType] || selectedRequest.kitchenType}</p></div>
                <div><Label className="text-muted-foreground">Preferred Start</Label><p className="font-medium">{formatDate(selectedRequest.preferredStartDate)}</p></div>
              </div>
              <div>
                <Label className="text-muted-foreground">Equipment Categories</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Array.isArray(selectedRequest.equipmentCategories) && selectedRequest.equipmentCategories.map((cat: string) => (
                    <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                  ))}
                </div>
              </div>
              {selectedRequest.notes && (
                <div><Label className="text-muted-foreground">Notes</Label><p className="text-sm bg-muted p-2 rounded">{selectedRequest.notes}</p></div>
              )}

              {/* Survey Report */}
              {selectedRequest.survey && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Survey Report</h3>
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground">Engineer:</span> <span className="font-medium">{selectedRequest.survey.engineer?.name}</span></div>
                      <div><span className="text-muted-foreground">Status:</span> <Badge variant={selectedRequest.survey.status === "COMPLETED" ? "success" : "warning"}>{selectedRequest.survey.status}</Badge></div>
                      <div><span className="text-muted-foreground">Scheduled:</span> {formatDate(selectedRequest.survey.scheduledDate)}</div>
                      {selectedRequest.survey.completedDate && <div><span className="text-muted-foreground">Completed:</span> {formatDate(selectedRequest.survey.completedDate)}</div>}
                    </div>
                    {selectedRequest.survey.overallCondition && (
                      <div><span className="text-muted-foreground">Overall Condition:</span> <Badge variant={selectedRequest.survey.overallCondition === "GOOD" ? "success" : selectedRequest.survey.overallCondition === "FAIR" ? "warning" : "destructive"}>{selectedRequest.survey.overallCondition}</Badge></div>
                    )}
                    {selectedRequest.survey.specialNotes && (
                      <div><span className="text-muted-foreground">Notes:</span> <p className="mt-1">{selectedRequest.survey.specialNotes}</p></div>
                    )}
                    {selectedRequest.survey.equipmentList && Array.isArray(selectedRequest.survey.equipmentList) && selectedRequest.survey.equipmentList.length > 0 && (
                      <div>
                        <span className="text-muted-foreground font-medium">Equipment Found:</span>
                        <div className="mt-1 space-y-1">
                          {selectedRequest.survey.equipmentList.map((eq: any, i: number) => (
                            <div key={i} className="bg-background p-2 rounded border text-xs">
                              <span className="font-medium">{eq.name}</span>
                              {eq.brand && <span className="text-muted-foreground"> - {eq.brand}</span>}
                              {eq.model && <span className="text-muted-foreground"> ({eq.model})</span>}
                              {eq.condition && <Badge variant={eq.condition === "Good" ? "success" : eq.condition === "Fair" ? "warning" : "destructive"} className="ml-2 text-[10px]">{eq.condition}</Badge>}
                              {eq.age && <span className="text-muted-foreground ml-2">Age: {eq.age}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Proposal Info */}
              {selectedRequest.proposal && (
                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Proposal</h3>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Status:</span> <Badge variant={selectedRequest.proposal.status === "ACCEPTED" ? "success" : selectedRequest.proposal.status === "REJECTED" ? "destructive" : "warning"}>{selectedRequest.proposal.status}</Badge></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Monthly Price:</span> <span className="font-medium">₹{selectedRequest.proposal.monthlyPrice?.toLocaleString("en-IN")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Visits:</span> <span>{selectedRequest.proposal.preventiveVisits} preventive + {selectedRequest.proposal.freeBreakdownVisits} breakdown</span></div>
                    {selectedRequest.proposal.contract && (
                      <div className="flex justify-between items-center pt-2 border-t mt-2"><span className="text-green-700 font-medium">Contract: {selectedRequest.proposal.contract.contractNumber}</span> <Badge variant="success">{selectedRequest.proposal.contract.status}</Badge></div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Verification */}
              {selectedRequest.payment && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Payment</h3>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Amount:</span> <span className="font-bold text-lg">{formatPrice(selectedRequest.payment.amount)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type:</span> <span>{selectedRequest.payment.paymentType}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Status:</span> <Badge variant={
                      selectedRequest.payment.status === "UPLOADED" ? "warning" :
                      selectedRequest.payment.status === "VERIFIED" ? "success" :
                      selectedRequest.payment.status === "REJECTED" ? "destructive" : "secondary"
                    }>{selectedRequest.payment.status}</Badge></div>
                    {selectedRequest.payment.rejectionReason && (
                      <div><span className="text-muted-foreground">Rejection Reason:</span> <span className="text-red-600">{selectedRequest.payment.rejectionReason}</span></div>
                    )}
                  </div>

                  {/* Screenshot preview */}
                  {selectedRequest.payment.screenshotUrl && (
                    <div>
                      <p className="text-sm font-medium mb-2">Payment Screenshot:</p>
                      <div className="border rounded-lg p-2 bg-white">
                        <img src={selectedRequest.payment.screenshotUrl} alt="Payment Screenshot" className="max-w-full max-h-[300px] object-contain mx-auto rounded" />
                      </div>
                    </div>
                  )}

                  {/* Verify / Reject Buttons */}
                  {selectedRequest.payment.status === "UPLOADED" && !showRejectPayment && (
                    <div className="flex gap-3">
                      <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleVerifyPayment(selectedRequest.payment!.id)} disabled={isVerifying}>
                        {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Verify Payment
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => setShowRejectPayment(true)} disabled={isVerifying}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {/* Reject reason form */}
                  {showRejectPayment && (
                    <div className="space-y-2">
                      <Label>Rejection Reason *</Label>
                      <Textarea value={paymentRejectReason} onChange={(e) => setPaymentRejectReason(e.target.value)} placeholder="e.g., Screenshot unclear, amount mismatch..." rows={2} />
                      <div className="flex gap-2">
                        <Button variant="destructive" onClick={() => handleRejectPayment(selectedRequest.payment!.id)} disabled={isVerifying}>
                          {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Reject"}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowRejectPayment(false); setPaymentRejectReason(""); }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Survey Scheduling Form */}
              {showSurveyForm && selectedRequest.status === "REQUESTED" && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Schedule Site Survey</h3>
                  <div>
                    <Label>Select Engineer *</Label>
                    <Select value={surveyEngineerId} onValueChange={setSurveyEngineerId}>
                      <SelectTrigger><SelectValue placeholder="Choose an engineer" /></SelectTrigger>
                      <SelectContent>
                        {engineers.map((eng) => (
                          <SelectItem key={eng.id} value={eng.id}>{eng.name} ({eng.phone || eng.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Survey Date *</Label>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={surveyDate}
                      onChange={(e) => setSurveyDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <Button onClick={handleScheduleSurvey} disabled={isUpdating} className="w-full">
                    {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</> : <><Calendar className="mr-2 h-4 w-4" /> Confirm Schedule</>}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {selectedRequest && !showSurveyForm && getActions(selectedRequest.status).length > 0 && (
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {getActions(selectedRequest.status).map((action) => (
                <Button
                  key={action.value}
                  variant={action.variant || "default"}
                  disabled={isUpdating}
                  onClick={() => handleAction(selectedRequest.id, action.value)}
                  className="w-full sm:w-auto"
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : action.value === "CREATE_PROPOSAL" ? <FileText className="mr-2 h-4 w-4" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  {action.label}
                </Button>
              ))}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}