"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Loader2, Send, FileText, Video, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  Candidate,
  ENGAGEMENT_TYPE_LABELS,
  POSITION_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  ACTIONS,
  DOC_LINKS,
} from "../_shared";

function docDownloadUrl(candidateId: string, url: string, name: string) {
  return `/api/admin/recruitment/${candidateId}/document-download?url=${encodeURIComponent(
    url
  )}&name=${encodeURIComponent(name)}`;
}

function DocBadge({ candidateId, url, label }: { candidateId: string; url: string; label: string }) {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-md border border-transparent bg-secondary py-0.5 pl-2.5 pr-1 text-xs font-semibold text-secondary-foreground">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        title="View"
        className="flex items-center gap-1 hover:underline"
      >
        <FileText className="h-3 w-3" /> {label}
      </a>
      <a
        href={docDownloadUrl(candidateId, url, label)}
        title="Download"
        className="rounded p-0.5 hover:bg-secondary-foreground/10"
      >
        <Download className="h-3 w-3" />
      </a>
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}:</span> {value ?? "-"}
    </p>
  );
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [finalCommissionRateInput, setFinalCommissionRateInput] = useState("20");
  const [finalMonthlySalaryInput, setFinalMonthlySalaryInput] = useState("");
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [interviewDateTime, setInterviewDateTime] = useState("");
  const [interviewNotesInput, setInterviewNotesInput] = useState("");
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [ratingInput, setRatingInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  const fetchCandidate = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${id}`);
      const data = await res.json();
      if (data.ok) setCandidate(data.data);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  const handleStatusChange = async (status: string) => {
    if (!candidate) return;
    if (status === "REJECTED" && !showRejectReason) {
      setShowRejectReason(true);
      return;
    }
    if (status === "REGISTRATION_PAYMENT_PENDING") {
      setFinalCommissionRateInput(String(candidate.finalCommissionRate ?? 20));
      setFinalMonthlySalaryInput(candidate.finalMonthlySalary ? String(candidate.finalMonthlySalary) : "");
      setShowPaymentForm(true);
      return;
    }
    if (status === "INTERVIEW_SCHEDULED") {
      setShowInterviewForm(true);
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${candidate.id}`, {
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
        await fetchCandidate();
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
    if (!candidate) return;
    const amount = parseInt(paymentAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    const isSalary = (candidate.engagementType ?? "COMMISSION") === "SALARY";
    const finalMonthlySalary = isSalary ? parseInt(finalMonthlySalaryInput) : undefined;
    if (isSalary && (!finalMonthlySalary || finalMonthlySalary <= 0)) {
      toast({ title: "Enter a valid final monthly salary", variant: "destructive" });
      return;
    }
    const finalCommissionRate = !isSalary ? parseInt(finalCommissionRateInput) || 20 : undefined;
    setSendingPaymentLink(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${candidate.id}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          ...(isSalary ? { finalMonthlySalary } : { finalCommissionRate }),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Payment link sent", description: data.data.paymentLink });
        setShowPaymentForm(false);
        setPaymentAmount("");
        await fetchCandidate();
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
    if (!candidate) return;
    if (!interviewDateTime) {
      toast({ title: "Select an interview date & time", variant: "destructive" });
      return;
    }
    setSchedulingInterview(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${candidate.id}`, {
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
        await fetchCandidate();
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
    if (!candidate) return;
    const rating = parseInt(ratingInput);
    if (!rating || rating < 1 || rating > 10) {
      toast({ title: "Enter a rating between 1 and 10", variant: "destructive" });
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Rating saved" });
        setRatingInput("");
        await fetchCandidate();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!candidate || !noteInput.trim()) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/recruitment/${candidate.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setNoteInput("");
        await fetchCandidate();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading || !candidate) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const skillEntries = Object.entries(candidate.skills || {}).filter(([, v]) => v);
  const equipmentEntries = Object.entries(candidate.equipmentExperience || {}).filter(([, v]) => v);
  const workCapabilityEntries = Object.entries(candidate.workCapability || {}).filter(([, v]) => v);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/recruitment")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            {candidate.fullName}
            <Badge variant={STATUS_COLORS[candidate.status] || "default"}>
              {STATUS_LABELS[candidate.status] || candidate.status}
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            {POSITION_LABELS[candidate.position] || candidate.position} — {candidate.city}, {candidate.state}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/admin/recruitment?message=${candidate.id}`)}
        >
          <Send className="mr-1 h-3 w-3" /> Message
        </Button>
      </div>

      {candidate.convertedUserId && (
        <div className="flex gap-2">
          <Link href={`/admin/engineers/${candidate.convertedUserId}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Technician Profile
            </Button>
          </Link>
          <a
            href={`/api/admin/recruitment/${candidate.id}/welcome-kit`}
            className="flex-1"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline" size="sm" className="w-full">
              Download Welcome Kit
            </Button>
          </a>
        </div>
      )}

      {/* Status & Pipeline Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status & Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {candidate.rejectionReason && (
            <div>
              <Label className="text-muted-foreground">Rejection Reason</Label>
              <p className="rounded bg-muted p-2 text-sm text-red-600">{candidate.rejectionReason}</p>
            </div>
          )}

          {candidate.interviewScheduledAt && (
            <div className="rounded bg-muted p-2 text-sm">
              <span className="text-muted-foreground">Interview scheduled:</span>{" "}
              {new Date(candidate.interviewScheduledAt).toLocaleString("en-IN")}
              {candidate.interviewNotes && (
                <p className="mt-1 text-xs text-muted-foreground">{candidate.interviewNotes}</p>
              )}
            </div>
          )}

          {showRejectReason && (
            <div className="space-y-2 border-t pt-3">
              <Label>Rejection Reason *</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={isUpdating || !rejectReason.trim()}
                  onClick={() => handleStatusChange("REJECTED")}
                >
                  Confirm Reject
                </Button>
                <Button variant="outline" onClick={() => setShowRejectReason(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {showPaymentForm && (
            <div className="space-y-2 border-t pt-3">
              <Label>Registration Fee Amount (₹) *</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="e.g. 2000"
              />
              {(candidate.engagementType ?? "COMMISSION") === "SALARY" ? (
                <>
                  <Label>Final Monthly Salary (₹) *</Label>
                  <Input
                    type="number"
                    value={finalMonthlySalaryInput}
                    onChange={(e) => setFinalMonthlySalaryInput(e.target.value)}
                    placeholder="e.g. 18000"
                  />
                </>
              ) : (
                <>
                  <Label>Final Commission Rate (%) *</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={finalCommissionRateInput}
                    onChange={(e) => setFinalCommissionRateInput(e.target.value)}
                    placeholder="e.g. 20"
                  />
                </>
              )}
              <div className="flex gap-2">
                <Button
                  disabled={
                    sendingPaymentLink ||
                    !paymentAmount ||
                    ((candidate.engagementType ?? "COMMISSION") === "SALARY" && !finalMonthlySalaryInput)
                  }
                  onClick={handleCreatePayment}
                >
                  {sendingPaymentLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Payment Link
                </Button>
                <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

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
                <Button variant="outline" onClick={() => setShowInterviewForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!showRejectReason && !showPaymentForm && !showInterviewForm && (ACTIONS[candidate.status] || []).length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
              {(ACTIONS[candidate.status] || []).map((action) => (
                <Button
                  key={action.value}
                  variant={action.variant || "default"}
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(action.value)}
                  className="w-full sm:w-auto"
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Row label="Mobile" value={candidate.mobile} />
          <Row label="WhatsApp" value={candidate.whatsappNumber} />
          <Row label="Email" value={candidate.email} />
          <Row label="Date of Birth" value={candidate.dob ? formatDate(candidate.dob) : null} />
          <Row label="Age" value={candidate.age ? `${candidate.age} yrs` : null} />
          <Row label="Gender" value={candidate.gender} />
          <Row label="City" value={candidate.city} />
          <Row label="State" value={candidate.state} />
          <Row label="PIN Code" value={candidate.pinCode} />
          <Row label="Current Address" value={candidate.currentAddress} />
          <Row label="Permanent Address" value={candidate.permanentAddress} />
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Education</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Row label="Highest Qualification" value={candidate.highestQualification} />
          <Row label="Technical Qualification" value={candidate.technicalQualification} />
          <Row label="Institute Name" value={candidate.instituteName} />
          <Row label="Year of Passing" value={candidate.yearOfPassing} />
        </CardContent>
      </Card>

      {/* Experience & Engagement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experience & Engagement</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Row label="Total Experience" value={candidate.totalExperienceYears != null ? `${candidate.totalExperienceYears} yrs` : null} />
          <Row label="Current Employer" value={candidate.currentEmployer} />
          <Row label="Previous Employers" value={candidate.previousEmployers} />
          <Row
            label="Engagement Type"
            value={candidate.engagementType ? ENGAGEMENT_TYPE_LABELS[candidate.engagementType] : null}
          />
          <Row label="Current Salary" value={candidate.currentSalary ? `₹${candidate.currentSalary.toLocaleString("en-IN")}` : null} />
          <Row label="Expected Salary" value={candidate.expectedSalary ? `₹${candidate.expectedSalary.toLocaleString("en-IN")}` : null} />
          <Row label="Notice Period" value={candidate.noticePeriod} />
          <Row label="Ready to Join Immediately" value={candidate.readyImmediate ? "Yes" : "No"} />
          <Row
            label="Final Commission Rate"
            value={candidate.finalCommissionRate != null ? `${candidate.finalCommissionRate}%` : null}
          />
          <Row
            label="Final Monthly Salary"
            value={candidate.finalMonthlySalary ? `₹${candidate.finalMonthlySalary.toLocaleString("en-IN")}` : null}
          />
        </CardContent>
      </Card>

      {/* Skills & Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills & Equipment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {skillEntries.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Technical Skills</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {skillEntries.map(([k]) => (
                  <Badge key={k} variant="outline" className="text-xs">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {equipmentEntries.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Equipment Experience</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {equipmentEntries.map(([k]) => (
                  <Badge key={k} variant="outline" className="text-xs">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {workCapabilityEntries.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Work Capability</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {workCapabilityEntries.map(([k]) => (
                  <Badge key={k} variant="outline" className="text-xs">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {skillEntries.length === 0 && equipmentEntries.length === 0 && workCapabilityEntries.length === 0 && (
            <p className="text-sm text-muted-foreground">Not provided</p>
          )}
        </CardContent>
      </Card>

      {/* Driving Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Driving Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Row label="Two-Wheeler Available" value={candidate.twoWheelerAvailable ? "Yes" : "No"} />
          <Row label="Four-Wheeler Driving" value={candidate.fourWheelerDriving ? "Yes" : "No"} />
          <Row label="Driving License Number" value={candidate.drivingLicenseNumber} />
          {candidate.drivingLicenseUrl && (
            <div>
              <Label className="text-muted-foreground">Driving License Document</Label>
              <div className="mt-1">
                <DocBadge candidateId={candidate.id} url={candidate.drivingLicenseUrl} label="Driving License" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Family Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Family Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Row label="Father's Name" value={candidate.fatherName} />
          <Row label="Mother's Name" value={candidate.motherName} />
          <Row label="Marital Status" value={candidate.maritalStatus} />
          <Row label="Spouse Name" value={candidate.spouseName} />
          <Row label="Family Members" value={candidate.familyMembersCount} />
          <Row label="Emergency Contact" value={candidate.emergencyContact} />
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Row label="Account Holder Name" value={candidate.bankAccountName} />
          <Row label="Bank Name" value={candidate.bankName} />
          <Row label="Account Number" value={candidate.bankAccountNumber} />
          <Row label="IFSC Code" value={candidate.bankIfsc} />
        </CardContent>
      </Card>

      {/* Documents & Video */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Documents & Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {DOC_LINKS.map((d) => {
              const url = candidate[d.key] as string | null;
              return url ? <DocBadge key={d.label} candidateId={candidate.id} url={url} label={d.label} /> : null;
            })}
            {(candidate.experienceCertUrls || []).map((url, i) => (
              <DocBadge key={`exp-${i}`} candidateId={candidate.id} url={url} label={`Experience Cert ${i + 1}`} />
            ))}
            {(candidate.educationCertUrls || []).map((url, i) => (
              <DocBadge key={`edu-${i}`} candidateId={candidate.id} url={url} label={`Education Cert ${i + 1}`} />
            ))}
          </div>

          {candidate.videoIntroUrl && (
            <div>
              <p className="mb-1 flex items-center gap-1 font-medium">
                <Video className="h-3.5 w-3.5" /> Video Introduction
              </p>
              <video src={candidate.videoIntroUrl} controls className="w-full max-w-sm rounded-md border" />
              <div className="mt-2">
                <DocBadge candidateId={candidate.id} url={candidate.videoIntroUrl} label="Video Intro" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recruiter Rating & Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recruiter Rating & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Recruiter Rating (1-10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={ratingInput}
                placeholder={candidate.rating ? String(candidate.rating) : "Rate candidate"}
                onChange={(e) => setRatingInput(e.target.value)}
              />
            </div>
            <Button disabled={isUpdating} onClick={handleRatingSave}>
              Save
            </Button>
          </div>

          <div className="space-y-2 border-t pt-3">
            <Label>Recruiter Notes</Label>
            <div className="flex gap-2">
              <Textarea rows={2} value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Add a note..." />
              <Button disabled={isUpdating} onClick={handleAddNote}>
                Add
              </Button>
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {candidate.notes?.map((n) => (
                <div key={n.id} className="rounded bg-muted p-2 text-xs">
                  <p>{n.note}</p>
                  <p className="mt-1 text-muted-foreground">
                    {n.author.name} — {formatDate(n.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
