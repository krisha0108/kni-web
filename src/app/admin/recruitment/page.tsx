"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  UserCheck,
  Search,
  Loader2,
  Eye,
  ArrowRight,
  FileText,
  Video,
  Star,
  Send,
  QrCode,
  Download,
} from "lucide-react";
import QRCode from "qrcode";
import { formatDate } from "@/lib/utils";
import { SKILLS_BY_POSITION, EQUIPMENT_LIST } from "@/app/apply/config";

const ALL_SKILLS = Array.from(new Set(Object.values(SKILLS_BY_POSITION).flat())).sort();

interface Candidate {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  city: string;
  state: string;
  position: string;
  totalExperienceYears: number | null;
  expectedSalary: number | null;
  status: string;
  rating: number | null;
  rejectionReason: string | null;
  interviewScheduledAt: string | null;
  interviewNotes: string | null;
  convertedUserId: string | null;
  photoUrl: string | null;
  aadhaarUrl: string | null;
  panUrl: string | null;
  resumeUrl: string | null;
  drivingLicenseUrl: string | null;
  videoIntroUrl: string | null;
  skills: Record<string, boolean> | null;
  equipmentExperience: Record<string, boolean> | null;
  workCapability: Record<string, boolean> | null;
  createdAt: string;
  notes?: { id: string; note: string; createdAt: string; author: { name: string } }[];
  activities?: { id: string; description: string; createdAt: string }[];
}

const POSITION_LABELS: Record<string, string> = {
  TECHNICIAN_MECHANICAL: "Mechanical",
  TECHNICIAN_ELECTRICAL: "Electrical",
  TECHNICIAN_REFRIGERATION: "Refrigeration",
  TECHNICIAN_INDUCTION: "Induction",
  TECHNICIAN_COMMERCIAL_KITCHEN: "Commercial Kitchen",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  ON_HOLD: "On Hold",
  REJECTED: "Rejected",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  TECHNICAL_EVALUATION: "Technical Evaluation",
  APPROVED: "Approved",
  REGISTRATION_PAYMENT_PENDING: "Payment Pending",
  REGISTERED_PARTNER: "Registered Partner",
  TRAINING_PENDING: "Training Pending",
  ACTIVE_TECHNICIAN: "Active Technician",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  NEW: "secondary",
  UNDER_REVIEW: "default",
  SHORTLISTED: "warning",
  ON_HOLD: "secondary",
  REJECTED: "destructive",
  INTERVIEW_SCHEDULED: "default",
  TECHNICAL_EVALUATION: "default",
  APPROVED: "success",
  REGISTRATION_PAYMENT_PENDING: "warning",
  REGISTERED_PARTNER: "success",
  TRAINING_PENDING: "warning",
  ACTIVE_TECHNICIAN: "success",
};

const ACTIONS: Record<string, { value: string; label: string; variant?: "default" | "destructive" }[]> = {
  NEW: [
    { value: "UNDER_REVIEW", label: "Start Review" },
    { value: "SHORTLISTED", label: "Shortlist" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  UNDER_REVIEW: [
    { value: "SHORTLISTED", label: "Shortlist" },
    { value: "ON_HOLD", label: "Hold" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  SHORTLISTED: [
    { value: "INTERVIEW_SCHEDULED", label: "Schedule Interview" },
    { value: "ON_HOLD", label: "Hold" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  ON_HOLD: [
    { value: "UNDER_REVIEW", label: "Resume Review" },
    { value: "SHORTLISTED", label: "Shortlist" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  INTERVIEW_SCHEDULED: [
    { value: "TECHNICAL_EVALUATION", label: "Move to Technical Evaluation" },
    { value: "ON_HOLD", label: "Hold" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  TECHNICAL_EVALUATION: [
    { value: "APPROVED", label: "Approve" },
    { value: "ON_HOLD", label: "Hold" },
    { value: "REJECTED", label: "Reject", variant: "destructive" },
  ],
  APPROVED: [{ value: "REGISTRATION_PAYMENT_PENDING", label: "Send Payment Link" }],
  REGISTRATION_PAYMENT_PENDING: [{ value: "REGISTERED_PARTNER", label: "Mark Payment Received" }],
  REGISTERED_PARTNER: [{ value: "TRAINING_PENDING", label: "Move to Training" }],
  TRAINING_PENDING: [{ value: "ACTIVE_TECHNICIAN", label: "Mark Active Technician" }],
  REJECTED: [{ value: "UNDER_REVIEW", label: "Reopen" }],
};

const DOC_LINKS: { key: keyof Candidate; label: string }[] = [
  { key: "photoUrl", label: "Photo" },
  { key: "aadhaarUrl", label: "Aadhaar" },
  { key: "panUrl", label: "PAN" },
  { key: "resumeUrl", label: "Resume" },
  { key: "drivingLicenseUrl", label: "Driving License" },
];

export default function AdminRecruitmentPage() {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPosition, setFilterPosition] = useState("ALL");
  const [filterSkill, setFilterSkill] = useState("ALL");
  const [filterEquipment, setFilterEquipment] = useState("ALL");
  const [minExperience, setMinExperience] = useState("");
  const [maxExperience, setMaxExperience] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [filterDocuments, setFilterDocuments] = useState("ALL");
  const [filterVideo, setFilterVideo] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [interviewDateTime, setInterviewDateTime] = useState("");
  const [interviewNotesInput, setInterviewNotesInput] = useState("");
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [ratingInput, setRatingInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkChannel, setBulkChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [applyUrl, setApplyUrl] = useState("/apply");

  useEffect(() => {
    setApplyUrl(`${window.location.origin}/apply`);
  }, []);

  const handleGenerateQr = async () => {
    setQrOpen(true);
    setQrLoading(true);
    try {
      const dataUrl = await QRCode.toDataURL(applyUrl, { width: 512, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch {
      toast({ title: "Error", description: "Failed to generate QR code", variant: "destructive" });
    } finally {
      setQrLoading(false);
    }
  };

  const fetchCandidates = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterPosition !== "ALL") params.set("position", filterPosition);
      if (filterSkill !== "ALL") params.set("skill", filterSkill);
      if (filterEquipment !== "ALL") params.set("equipment", filterEquipment);
      if (minExperience) params.set("minExperience", minExperience);
      if (maxExperience) params.set("maxExperience", maxExperience);
      if (minSalary) params.set("minSalary", minSalary);
      if (maxSalary) params.set("maxSalary", maxSalary);
      if (filterDocuments !== "ALL") params.set("hasDocuments", filterDocuments);
      if (filterVideo !== "ALL") params.set("hasVideo", filterVideo);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", page.toString());
      params.set("pageSize", "20");
      const res = await fetch(`/api/admin/recruitment?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setCandidates(data.data.items);
        setTotalPages(data.data.totalPages);
        setStatusCounts(data.data.statusCounts);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch candidates", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [
    filterStatus,
    filterPosition,
    filterSkill,
    filterEquipment,
    minExperience,
    maxExperience,
    minSalary,
    maxSalary,
    filterDocuments,
    filterVideo,
    searchQuery,
    page,
    toast,
  ]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const refreshSelected = async (id: string) => {
    const res = await fetch(`/api/admin/recruitment/${id}`);
    const data = await res.json();
    if (data.ok) setSelected(data.data);
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (status === "REJECTED" && !showRejectReason) {
      setShowRejectReason(true);
      return;
    }
    if (status === "REGISTRATION_PAYMENT_PENDING") {
      setShowPaymentForm(true);
      return;
    }
    if (status === "INTERVIEW_SCHEDULED") {
      setShowInterviewForm(true);
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "REJECTED" ? { rejectionReason: rejectReason } : {}),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Status updated", description: `Moved to ${STATUS_LABELS[status]}` });
        setShowRejectReason(false);
        setRejectReason("");
        await refreshSelected(id);
        fetchCandidates();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!selected) return;
    const amount = parseInt(paymentAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSendingPaymentLink(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${selected.id}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Payment link sent", description: data.data.paymentLink });
        setShowPaymentForm(false);
        setPaymentAmount("");
        await refreshSelected(selected.id);
        fetchCandidates();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create payment link", variant: "destructive" });
    } finally {
      setSendingPaymentLink(false);
    }
  };

  const handleScheduleInterview = async () => {
    if (!selected) return;
    if (!interviewDateTime) {
      toast({ title: "Select an interview date & time", variant: "destructive" });
      return;
    }
    setSchedulingInterview(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "INTERVIEW_SCHEDULED",
          interviewScheduledAt: new Date(interviewDateTime).toISOString(),
          interviewNotes: interviewNotesInput || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Interview scheduled" });
        setShowInterviewForm(false);
        setInterviewDateTime("");
        setInterviewNotesInput("");
        await refreshSelected(selected.id);
        fetchCandidates();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to schedule interview", variant: "destructive" });
    } finally {
      setSchedulingInterview(false);
    }
  };

  const handleRatingSave = async () => {
    if (!selected) return;
    const rating = parseInt(ratingInput);
    if (!rating || rating < 1 || rating > 10) {
      toast({ title: "Enter a rating between 1 and 10", variant: "destructive" });
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Rating saved" });
        setRatingInput("");
        await refreshSelected(selected.id);
        fetchCandidates();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!selected || !noteInput.trim()) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${selected.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setNoteInput("");
        await refreshSelected(selected.id);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkSend = async () => {
    if (!bulkMessage.trim() || checkedIds.length === 0) return;
    setBulkSending(true);
    try {
      const res = await fetch("/api/admin/recruitment/bulk-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: checkedIds, channel: bulkChannel, message: bulkMessage }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: `${bulkChannel} sent`, description: `Sent to ${checkedIds.length} candidate(s)` });
        setBulkOpen(false);
        setBulkMessage("");
        setCheckedIds([]);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl lg:text-3xl">
            <UserCheck className="h-6 w-6" />
            Recruitment CRM
          </h1>
          <p className="text-muted-foreground">
            Manage technician applications from the QR-code registration form
          </p>
        </div>
        <Button variant="outline" onClick={handleGenerateQr}>
          <QrCode className="mr-2 h-4 w-4" /> Get QR Code
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, or email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={filterPosition} onValueChange={(v) => { setFilterPosition(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filter by position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Positions</SelectItem>
                {Object.entries(POSITION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <Select value={filterSkill} onValueChange={(v) => { setFilterSkill(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any Skill</SelectItem>
                {ALL_SKILLS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEquipment} onValueChange={(v) => { setFilterEquipment(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by equipment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any Equipment</SelectItem>
                {EQUIPMENT_LIST.map((eq) => (
                  <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min exp (yrs)"
                className="w-[110px]"
                value={minExperience}
                onChange={(e) => { setMinExperience(e.target.value); setPage(1); }}
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max exp (yrs)"
                className="w-[110px]"
                value={maxExperience}
                onChange={(e) => { setMaxExperience(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min salary"
                className="w-[110px]"
                value={minSalary}
                onChange={(e) => { setMinSalary(e.target.value); setPage(1); }}
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max salary"
                className="w-[110px]"
                value={maxSalary}
                onChange={(e) => { setMaxSalary(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={filterDocuments} onValueChange={(v) => { setFilterDocuments(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[170px]">
                <SelectValue placeholder="Documents?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Documents: Any</SelectItem>
                <SelectItem value="true">Documents: Uploaded</SelectItem>
                <SelectItem value="false">Documents: Missing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterVideo} onValueChange={(v) => { setFilterVideo(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[170px]">
                <SelectValue placeholder="Video?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Video: Any</SelectItem>
                <SelectItem value="true">Video: Uploaded</SelectItem>
                <SelectItem value="false">Video: Missing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}</span>
            {checkedIds.length > 0 && (
              <Button size="sm" onClick={() => setBulkOpen(true)}>
                <Send className="mr-2 h-4 w-4" /> Message {checkedIds.length} selected
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-slate-600">{statusCounts.NEW || 0}</p><p className="text-sm text-muted-foreground">New</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-yellow-600">{statusCounts.SHORTLISTED || 0}</p><p className="text-sm text-muted-foreground">Shortlisted</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-green-600">{statusCounts.APPROVED || 0}</p><p className="text-sm text-muted-foreground">Approved</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-green-700">{statusCounts.ACTIVE_TECHNICIAN || 0}</p><p className="text-sm text-muted-foreground">Active Technicians</p></CardContent></Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card><CardContent className="py-12 text-center"><Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" /><p className="text-muted-foreground">Loading...</p></CardContent></Card>
      ) : candidates.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><UserCheck className="mb-4 h-12 w-12 text-muted-foreground" /><p className="text-lg text-muted-foreground">No applications found</p></CardContent></Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead className="hidden md:table-cell">Position</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead className="hidden md:table-cell">Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Applied</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Checkbox
                      checked={checkedIds.includes(c.id)}
                      onCheckedChange={(v) =>
                        setCheckedIds((prev) => (v ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {c.fullName}
                    <span className="block text-xs text-muted-foreground">{c.mobile}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{POSITION_LABELS[c.position] || c.position}</TableCell>
                  <TableCell className="hidden lg:table-cell">{c.city}, {c.state}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.totalExperienceYears ?? "-"} yrs</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[c.status] || "default"}>{STATUS_LABELS[c.status] || c.status}</Badge>
                    {c.rating && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {c.rating}/10
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View"
                        onClick={async () => { await refreshSelected(c.id); setShowRejectReason(false); setShowPaymentForm(false); setShowInterviewForm(false); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Message"
                        onClick={() => { setCheckedIds([c.id]); setBulkOpen(true); }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setShowRejectReason(false); setShowPaymentForm(false); setShowInterviewForm(false); } }}>
        <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-[650px] sm:w-full">
          <DialogHeader>
            <DialogTitle>{selected?.fullName}</DialogTitle>
            <DialogDescription>{selected && (POSITION_LABELS[selected.position] || selected.position)} — {selected?.city}, {selected?.state}</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setCheckedIds([selected.id]); setBulkOpen(true); }}
                  >
                    <Send className="mr-1 h-3 w-3" /> Message
                  </Button>
                  <Badge variant={STATUS_COLORS[selected.status] || "default"} className="text-sm">
                    {STATUS_LABELS[selected.status] || selected.status}
                  </Badge>
                </div>
              </div>

              {selected.convertedUserId && (
                <div className="flex gap-2">
                  <Link href={`/admin/engineers/${selected.convertedUserId}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View Technician Profile
                    </Button>
                  </Link>
                  <a href={`/api/admin/recruitment/${selected.id}/welcome-kit`} className="flex-1" target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="w-full">
                      Download Welcome Kit
                    </Button>
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Mobile:</span> <span className="font-medium">{selected.mobile}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selected.email || "-"}</span></div>
                <div><span className="text-muted-foreground">Experience:</span> <span className="font-medium">{selected.totalExperienceYears ?? "-"} yrs</span></div>
                <div><span className="text-muted-foreground">Expected Salary:</span> <span className="font-medium">{selected.expectedSalary ? `₹${selected.expectedSalary.toLocaleString("en-IN")}` : "-"}</span></div>
              </div>

              {selected.rejectionReason && (
                <div><Label className="text-muted-foreground">Rejection Reason</Label><p className="rounded bg-muted p-2 text-sm text-red-600">{selected.rejectionReason}</p></div>
              )}

              {/* Skills */}
              {selected.skills && Object.keys(selected.skills).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Skills</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(selected.skills).filter(([, v]) => v).map(([k]) => (
                      <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div>
                <Label className="text-muted-foreground">Documents</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {DOC_LINKS.map((d) => {
                    const url = selected[d.key] as string | null;
                    return url ? (
                      <a key={d.label} href={url} target="_blank" rel="noreferrer">
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                          <FileText className="h-3 w-3" /> {d.label}
                        </Badge>
                      </a>
                    ) : null;
                  })}
                  {selected.videoIntroUrl && (
                    <a href={selected.videoIntroUrl} target="_blank" rel="noreferrer">
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <Video className="h-3 w-3" /> Video Intro
                      </Badge>
                    </a>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-end gap-2 border-t pt-3">
                <div className="flex-1">
                  <Label>Recruiter Rating (1-10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={ratingInput}
                    placeholder={selected.rating ? String(selected.rating) : "Rate candidate"}
                    onChange={(e) => setRatingInput(e.target.value)}
                  />
                </div>
                <Button disabled={isUpdating} onClick={handleRatingSave}>Save</Button>
              </div>

              {/* Notes */}
              <div className="space-y-2 border-t pt-3">
                <Label>Recruiter Notes</Label>
                <div className="flex gap-2">
                  <Textarea rows={2} value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Add a note..." />
                  <Button disabled={isUpdating} onClick={handleAddNote}>Add</Button>
                </div>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {selected.notes?.map((n) => (
                    <div key={n.id} className="rounded bg-muted p-2 text-xs">
                      <p>{n.note}</p>
                      <p className="mt-1 text-muted-foreground">{n.author.name} — {formatDate(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reject reason form */}
              {showRejectReason && (
                <div className="space-y-2 border-t pt-3">
                  <Label>Rejection Reason *</Label>
                  <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
                  <div className="flex gap-2">
                    <Button variant="destructive" disabled={isUpdating || !rejectReason.trim()} onClick={() => handleStatusChange(selected.id, "REJECTED")}>
                      Confirm Reject
                    </Button>
                    <Button variant="outline" onClick={() => setShowRejectReason(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Registration payment link form */}
              {showPaymentForm && (
                <div className="space-y-2 border-t pt-3">
                  <Label>Registration Fee Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 2000"
                  />
                  <div className="flex gap-2">
                    <Button disabled={sendingPaymentLink || !paymentAmount} onClick={handleCreatePayment}>
                      {sendingPaymentLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send Payment Link
                    </Button>
                    <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Interview scheduling form */}
              {showInterviewForm && (
                <div className="space-y-2 border-t pt-3">
                  <Label>Interview Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={interviewDateTime}
                    onChange={(e) => setInterviewDateTime(e.target.value)}
                  />
                  <Label>Notes (interviewer, location, etc.)</Label>
                  <Textarea rows={2} value={interviewNotesInput} onChange={(e) => setInterviewNotesInput(e.target.value)} />
                  <div className="flex gap-2">
                    <Button disabled={schedulingInterview || !interviewDateTime} onClick={handleScheduleInterview}>
                      {schedulingInterview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm Schedule
                    </Button>
                    <Button variant="outline" onClick={() => setShowInterviewForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {selected.interviewScheduledAt && (
                <div className="rounded bg-muted p-2 text-sm">
                  <span className="text-muted-foreground">Interview scheduled:</span>{" "}
                  {new Date(selected.interviewScheduledAt).toLocaleString("en-IN")}
                  {selected.interviewNotes && <p className="mt-1 text-xs text-muted-foreground">{selected.interviewNotes}</p>}
                </div>
              )}
            </div>
          )}

          {selected && !showRejectReason && !showPaymentForm && !showInterviewForm && (ACTIONS[selected.status] || []).length > 0 && (
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              {(ACTIONS[selected.status] || []).map((action) => (
                <Button
                  key={action.value}
                  variant={action.variant || "default"}
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(selected.id, action.value)}
                  className="w-full sm:w-auto"
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  {action.label}
                </Button>
              ))}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk message dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {checkedIds.length === 1
                ? `Message ${candidates.find((c) => c.id === checkedIds[0])?.fullName || selected?.fullName || "candidate"}`
                : `Message ${checkedIds.length} candidates`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={bulkChannel} onValueChange={(v) => setBulkChannel(v as "SMS" | "EMAIL")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
              </SelectContent>
            </Select>
            <Textarea rows={4} value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} placeholder="Message..." />
          </div>
          <DialogFooter>
            <Button disabled={bulkSending || !bulkMessage.trim()} onClick={handleBulkSend}>
              {bulkSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR code dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Registration QR Code</DialogTitle>
            <DialogDescription>
              Print this on newspaper/social media ads — candidates scan it to open the application form.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrLoading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : qrDataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Registration QR Code" className="h-64 w-64 rounded border" />
                <p className="break-all text-center text-xs text-muted-foreground">{applyUrl}</p>
                <a href={qrDataUrl} download="kni-recruitment-qr.png" className="w-full">
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" /> Download PNG
                  </Button>
                </a>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
