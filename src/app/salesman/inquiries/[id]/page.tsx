"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Phone, Mail, MapPin, Plus, MessageSquare, Send } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  performedBy: string;
}

interface Thread {
  id: string;
  message: string;
  subject: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface Visit {
  id: string;
  companyName: string;
  visitDate: string;
  status: string;
}

interface InquiryDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string | null;
  businessName: string | null;
  businessType: string;
  budgetRange: string | null;
  areaInSqFt: number | null;
  timeline: string | null;
  status: string;
  priority: string;
  source: string;
  message: string | null;
  servicesNeeded: string | null;
  accessToken: string | null;
  createdAt: string;
  activities: Activity[];
  visits: Visit[];
}

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "ON_HOLD"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const BUDGET_LABELS: Record<string, string> = {
  UNDER_5L: "Under 5 Lakhs",
  L5_TO_10L: "5 - 10 Lakhs",
  L10_TO_25L: "10 - 25 Lakhs",
  L25_TO_50L: "25 - 50 Lakhs",
  L50_TO_1CR: "50 Lakhs - 1 Crore",
  ABOVE_1CR: "Above 1 Crore",
};

const TIMELINE_LABELS: Record<string, string> = {
  IMMEDIATELY: "Immediately",
  WITHIN_1_MONTH: "Within 1 Month",
  WITHIN_3_MONTHS: "Within 3 Months",
  WITHIN_6_MONTHS: "Within 6 Months",
  WITHIN_1_YEAR: "Within 1 Year",
  JUST_EXPLORING: "Just Exploring",
};

export default function SalesmanInquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [note, setNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const { toast } = useToast();

  const fetchInquiry = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/salesman/inquiries/${id}`);
      const data = await res.json();
      if (data.ok) setInquiry(data.data);
      else {
        toast({ title: "Error", description: data.error || "Inquiry not found", variant: "destructive" });
        router.push("/salesman/inquiries");
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, router, toast]);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(`/api/salesman/inquiries/${id}/threads`);
      const data = await res.json();
      if (data.ok) setThreads(data.data);
    } catch {
      // silent
    }
  }, [id]);

  useEffect(() => {
    fetchInquiry();
    fetchThreads();
  }, [fetchInquiry, fetchThreads]);

  const getEmailTemplates = () => {
    if (!inquiry) return [];
    const name = inquiry.name;
    const biz = inquiry.businessType.replace(/_/g, " ").toLowerCase();
    const budget = inquiry.budgetRange ? BUDGET_LABELS[inquiry.budgetRange] || inquiry.budgetRange : "";
    const area = inquiry.areaInSqFt ? `${inquiry.areaInSqFt.toLocaleString()} sq ft` : "";
    const city = inquiry.city;
    const services = inquiry.servicesNeeded || "";
    const timeline = inquiry.timeline ? TIMELINE_LABELS[inquiry.timeline] || inquiry.timeline : "";

    return [
      {
        id: "welcome",
        label: "Welcome",
        subject: `Welcome to KNI, ${name}! We Received Your Inquiry`,
        message: `Dear ${name},\n\nThank you for reaching out to Kitchen Network International! We have received your inquiry for setting up a ${biz} in ${city}.\n\nOur team is reviewing your requirements and will get in touch with you within 24 hours to discuss the next steps.\n\nIn the meantime, if you have any questions, feel free to reply to this email or call us directly.\n\nWe look forward to helping you build your dream kitchen!`,
      },
      {
        id: "proposal",
        label: "Proposal",
        subject: `Your ${biz.charAt(0).toUpperCase() + biz.slice(1)} Setup Proposal from KNI`,
        message: `Dear ${name},\n\nThank you for your interest in setting up a ${biz} in ${city}. Based on our discussion, here is a summary of what we can offer:\n\nPROJECT OVERVIEW:\n- Business Type: ${biz.charAt(0).toUpperCase() + biz.slice(1)}${area ? `\n- Kitchen Area: ${area}` : ""}${budget ? `\n- Budget Range: ${budget}` : ""}${timeline ? `\n- Target Timeline: ${timeline}` : ""}\n\nSERVICES WE WILL PROVIDE:\n${services ? services.split(",").map((s: string) => `- ${s.trim()}`).join("\n") : "- Kitchen Design & Layout\n- Equipment Sourcing\n- Installation & Setup\n- AMC & Maintenance Support"}\n\nNEXT STEPS:\n1. Site visit to assess your location\n2. Detailed design & equipment list preparation\n3. Final quotation with itemized pricing\n4. Agreement & project kickoff\n\nPlease let us know a convenient time for the site visit.`,
      },
      {
        id: "followup",
        label: "Follow-up",
        subject: `Following Up on Your ${biz.charAt(0).toUpperCase() + biz.slice(1)} Inquiry - KNI`,
        message: `Dear ${name},\n\nHope you are doing well! We wanted to follow up on your inquiry about setting up a ${biz} in ${city}.\n\nWe had shared some details with you earlier and would love to know your thoughts. If you have any questions or need more information, we are happy to help.\n\nWould you be available for a quick call this week to discuss further?\n\nLooking forward to hearing from you!`,
      },
      {
        id: "sitevisit",
        label: "Site Visit",
        subject: `Site Visit Scheduled - KNI Team Visit for Your ${biz.charAt(0).toUpperCase() + biz.slice(1)}`,
        message: `Dear ${name},\n\nWe are pleased to confirm that our team will be visiting your location in ${city} to assess the space for your ${biz} setup.\n\nVISIT DETAILS:\n- Date: [Please update the date]\n- Time: [Please update the time]\n- Location: ${city}\n\nOur team will:\n1. Assess the available space and infrastructure\n2. Discuss your menu and workflow requirements\n3. Take measurements for kitchen design\n4. Understand your equipment preferences\n\nPlease ensure access to the location is available during the scheduled time.`,
      },
      {
        id: "custom",
        label: "Custom",
        subject: "",
        message: "",
      },
    ];
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = getEmailTemplates().find((t) => t.id === templateId);
    if (template) {
      setMessageSubject(template.subject);
      setMessageBody(template.message);
    }
  };

  const handleSendMessage = async () => {
    if (!messageBody.trim()) {
      toast({ title: "Error", description: "Message is required", variant: "destructive" });
      return;
    }
    setIsSendingMessage(true);
    try {
      const res = await fetch(`/api/salesman/inquiries/${id}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: messageSubject || null,
          message: messageBody,
          sendEmail: sendEmailNotification,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: "Message Sent",
          description: sendEmailNotification ? `Message sent & email notification to ${inquiry?.email}` : "Message added to thread",
        });
        setMessageSubject("");
        setMessageBody("");
        setSelectedTemplate("");
        fetchThreads();
        fetchInquiry();
      } else {
        toast({ title: "Error", description: data.error || "Failed to send", variant: "destructive" });
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  const updateField = async (field: "status" | "priority", value: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/salesman/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Updated", description: `${field === "status" ? "Status" : "Priority"} updated` });
        fetchInquiry();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/salesman/inquiries/${id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "note", notes: note }),
      });
      const data = await res.json();
      if (data.ok) {
        setNote("");
        fetchInquiry();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } finally {
      setIsAddingNote(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!inquiry) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/salesman/inquiries")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{inquiry.businessName || inquiry.name}</h1>
          <p className="text-muted-foreground">{inquiry.name} · {inquiry.city}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {inquiry.phone}</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {inquiry.email}</p>
              {inquiry.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {inquiry.address}</p>}
              {inquiry.servicesNeeded && <p><span className="text-muted-foreground">Services needed:</span> {inquiry.servicesNeeded}</p>}
              {inquiry.message && <p><span className="text-muted-foreground">Requirement:</span> {inquiry.message}</p>}
              <p className="text-xs text-muted-foreground">Source: {inquiry.source} · Created {formatDate(inquiry.createdAt)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200">
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Conversation Thread
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Messages with <span className="font-medium text-blue-600">{inquiry.email}</span>
                {inquiry.accessToken && <span className="text-xs ml-2">(Portal active)</span>}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
                {threads.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  threads.map((thread) => (
                    <div key={thread.id} className={`flex ${thread.isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${thread.isAdmin ? "bg-blue-600 text-white" : "bg-muted"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${thread.isAdmin ? "text-blue-100" : "text-muted-foreground"}`}>
                            {thread.isAdmin ? "Our Team" : "Customer"}
                          </span>
                        </div>
                        {thread.subject && (
                          <p className={`text-xs font-medium mb-1 ${thread.isAdmin ? "text-blue-200" : "text-muted-foreground"}`}>
                            Subject: {thread.subject}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{thread.message}</p>
                        <p className={`text-xs mt-1 ${thread.isAdmin ? "text-blue-200" : "text-muted-foreground"}`}>
                          {formatDateTime(thread.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {getEmailTemplates().map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleTemplateSelect(t.id)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
                        selectedTemplate === t.id
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <Input
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="Subject (optional)..."
                  className="text-sm"
                />

                <Textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Type your message..."
                  rows={6}
                  className="resize-none text-sm"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sendEmailSalesman"
                      checked={sendEmailNotification}
                      onCheckedChange={(checked) => setSendEmailNotification(!!checked)}
                    />
                    <label htmlFor="sendEmailSalesman" className="text-sm text-muted-foreground cursor-pointer">
                      Send email notification to customer
                    </label>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSendingMessage || !messageBody.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSendingMessage ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Related Visits</CardTitle></CardHeader>
            <CardContent>
              {inquiry.visits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No visits logged for this inquiry yet</p>
              ) : (
                <div className="space-y-2">
                  {inquiry.visits.map((v) => (
                    <div key={v.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                      <p className="text-sm">{v.companyName}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatDateTime(v.visitDate)}</span>
                        <Badge variant="outline" className="text-xs capitalize">{v.status.toLowerCase()}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push(`/salesman/visits?inquiryId=${inquiry.id}`)}
              >
                Log a Visit
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={inquiry.status} onValueChange={(v) => updateField("status", v)} disabled={isUpdating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ").toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={inquiry.priority} onValueChange={(v) => updateField("priority", v)} disabled={isUpdating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p.toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note or call summary..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={addNote} disabled={isAddingNote || !note.trim()}>
                  {isAddingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              {inquiry.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {inquiry.activities.map((a) => (
                    <div key={a.id} className="border-b pb-2 last:border-b-0">
                      <p className="text-sm">{a.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
