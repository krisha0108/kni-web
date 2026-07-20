"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Save,
  Trash2,
  Send,
  Clock,
  CalendarDays,
  MessageSquare,
  PhoneCall,
  Activity,
  ArrowRightLeft,
  StickyNote,
  UserCircle,
  AlertCircle,
} from "lucide-react";

type InquiryStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "NEGOTIATION" | "WON" | "LOST" | "ON_HOLD";
type InquiryPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Thread {
  id: string;
  message: string;
  subject: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  metadata: string | null;
  performedBy: string | null;
  createdAt: string;
}

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  businessType: string;
  businessName: string | null;
  budgetRange: string | null;
  areaInSqFt: number | null;
  timeline: string | null;
  message: string | null;
  servicesNeeded: string | null;
  source: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  followUpDate: string | null;
  accessToken: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<InquiryStatus, string> = {
  NEW: "bg-yellow-500",
  CONTACTED: "bg-blue-500",
  QUALIFIED: "bg-purple-500",
  PROPOSAL_SENT: "bg-indigo-500",
  NEGOTIATION: "bg-orange-500",
  WON: "bg-green-500",
  LOST: "bg-red-500",
  ON_HOLD: "bg-gray-500",
};

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

const ACTIVITY_ICONS: Record<string, { icon: typeof Mail; color: string }> = {
  EMAIL_SENT: { icon: Mail, color: "text-blue-500" },
  CALL_LOGGED: { icon: PhoneCall, color: "text-green-500" },
  STATUS_CHANGED: { icon: ArrowRightLeft, color: "text-purple-500" },
  PRIORITY_CHANGED: { icon: AlertCircle, color: "text-orange-500" },
  NOTE_ADDED: { icon: StickyNote, color: "text-gray-500" },
  CUSTOMER_REPLY: { icon: UserCircle, color: "text-red-500" },
  INQUIRY_CREATED: { icon: Activity, color: "text-yellow-500" },
};

export default function AdminLaunchPadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);

  // Editable fields
  const [status, setStatus] = useState<InquiryStatus>("NEW");
  const [priority, setPriority] = useState<InquiryPriority>("MEDIUM");
  const [followUpDate, setFollowUpDate] = useState("");

  // Thread compose
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Call log
  const [callDate, setCallDate] = useState(new Date().toISOString().split("T")[0]);
  const [callDuration, setCallDuration] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inquiryId = params.id as string;

  useEffect(() => {
    fetchInquiry();
    fetchThreads();
    fetchActivities();
  }, [inquiryId]);

  useEffect(() => {
    scrollToBottom();
  }, [threads]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchInquiry = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/launchpad/${inquiryId}`);
      const data = await response.json();

      if (data.ok) {
        const inq = data.data;
        setInquiry(inq);
        setStatus(inq.status);
        setPriority(inq.priority);
        setFollowUpDate(inq.followUpDate ? inq.followUpDate.split("T")[0] : "");
      } else {
        toast({ title: "Error", description: data.error || "Failed to fetch inquiry", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch inquiry", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThreads = async () => {
    try {
      const response = await fetch(`/api/admin/launchpad/${inquiryId}/threads`);
      const data = await response.json();
      if (data.ok) setThreads(data.data);
    } catch {
      // silent
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/admin/launchpad/${inquiryId}/activity`);
      const data = await response.json();
      if (data.ok) setActivities(data.data);
    } catch {
      // silent
    }
  };

  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/admin/launchpad/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          followUpDate: followUpDate || null,
        }),
      });
      const data = await response.json();

      if (data.ok) {
        setInquiry(data.data);
        toast({ title: "Saved", description: "All changes saved successfully" });
        fetchActivities();
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/launchpad/${inquiryId}`, { method: "DELETE" });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Deleted", description: "Inquiry deleted" });
        router.push("/admin/launchpad");
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleLogCall = async () => {
    if (!callNotes.trim()) {
      toast({ title: "Error", description: "Call notes are required", variant: "destructive" });
      return;
    }
    try {
      setIsLoggingCall(true);
      const response = await fetch(`/api/admin/launchpad/${inquiryId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callDate,
          duration: callDuration ? parseInt(callDuration) : null,
          notes: callNotes,
          outcome: callOutcome || null,
        }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Call Logged", description: "Call record saved successfully" });
        setCallNotes("");
        setCallDuration("");
        setCallOutcome("");
        setCallDate(new Date().toISOString().split("T")[0]);
        fetchActivities();
      } else {
        toast({ title: "Error", description: data.error || "Failed to log call", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to log call", variant: "destructive" });
    } finally {
      setIsLoggingCall(false);
    }
  };

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
    const templates = getEmailTemplates();
    const template = templates.find((t) => t.id === templateId);
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
    try {
      setIsSendingMessage(true);
      const response = await fetch(`/api/admin/launchpad/${inquiryId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: messageSubject || null,
          message: messageBody,
          sendEmail: sendEmailNotification,
        }),
      });
      const data = await response.json();

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
        fetchActivities();
      } else {
        toast({ title: "Error", description: data.error || "Failed to send", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const formatActivityDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="p-6">Loading inquiry...</CardContent></Card>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="p-6">Inquiry not found</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/launchpad")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{inquiry.name}</h1>
            <p className="text-muted-foreground">
              Inquiry #{inquiry.id.slice(-8).toUpperCase()} &middot; {inquiry.businessType.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_COLORS[inquiry.status]}>
            {inquiry.status.replace(/_/g, " ")}
          </Badge>
          <Button variant="destructive" size="sm" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{inquiry.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${inquiry.email}`} className="text-blue-600 hover:underline">
                  {inquiry.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${inquiry.phone}`} className="text-blue-600 hover:underline">
                  {inquiry.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{inquiry.city}</span>
              </div>
            </CardContent>
          </Card>

          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Business Type</p>
                  <Badge variant="outline" className="mt-1">
                    <Building2 className="h-3 w-3 mr-1" />
                    {inquiry.businessType.replace(/_/g, " ")}
                  </Badge>
                </div>
                {inquiry.businessName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Business Name</p>
                    <p className="font-medium">{inquiry.businessName}</p>
                  </div>
                )}
                {inquiry.budgetRange && (
                  <div>
                    <p className="text-sm text-muted-foreground">Budget Range</p>
                    <p className="font-medium">{BUDGET_LABELS[inquiry.budgetRange] || inquiry.budgetRange}</p>
                  </div>
                )}
                {inquiry.areaInSqFt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Area</p>
                    <p className="font-medium">{inquiry.areaInSqFt.toLocaleString()} sq ft</p>
                  </div>
                )}
                {inquiry.timeline && (
                  <div>
                    <p className="text-sm text-muted-foreground">Timeline</p>
                    <p className="font-medium">{TIMELINE_LABELS[inquiry.timeline] || inquiry.timeline}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium capitalize">{inquiry.source}</p>
                </div>
              </div>
              {inquiry.servicesNeeded && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Services Needed</p>
                  <div className="flex flex-wrap gap-2">
                    {inquiry.servicesNeeded.split(",").map((s) => (
                      <Badge key={s.trim()} variant="secondary">{s.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message */}
          {inquiry.message && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Message</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{inquiry.message}</p>
              </CardContent>
            </Card>
          )}

          {/* Conversation Thread */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Conversation Thread
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Messages with <span className="font-medium text-blue-600">{inquiry.email}</span>
                {inquiry.accessToken && (
                  <span className="text-xs ml-2">(Portal active)</span>
                )}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Thread Messages */}
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
                {threads.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  threads.map((thread) => (
                    <div
                      key={thread.id}
                      className={`flex ${thread.isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          thread.isAdmin
                            ? "bg-blue-600 text-white"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${thread.isAdmin ? "text-blue-100" : "text-muted-foreground"}`}>
                            {thread.isAdmin ? "Admin" : "Customer"}
                          </span>
                        </div>
                        {thread.subject && (
                          <p className={`text-xs font-medium mb-1 ${thread.isAdmin ? "text-blue-200" : "text-muted-foreground"}`}>
                            Subject: {thread.subject}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{thread.message}</p>
                        <p className={`text-xs mt-1 ${thread.isAdmin ? "text-blue-200" : "text-muted-foreground"}`}>
                          {formatDate(thread.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose Area */}
              <div className="border-t p-4 space-y-3">
                {/* Template Buttons */}
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
                      id="sendEmail"
                      checked={sendEmailNotification}
                      onCheckedChange={(checked) => setSendEmailNotification(!!checked)}
                    />
                    <label htmlFor="sendEmail" className="text-sm text-muted-foreground cursor-pointer">
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
        </div>

        {/* Right Column — Manage Inquiry */}
        <div className="space-y-4">
          {/* Combined Management Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manage Inquiry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Status */}
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as InquiryStatus)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="QUALIFIED">Qualified</SelectItem>
                    <SelectItem value="PROPOSAL_SENT">Proposal Sent</SelectItem>
                    <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                    <SelectItem value="WON">Won</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label className="text-sm font-medium">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as InquiryPriority)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Follow-up Date */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Follow-up Date
                </Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>

              {/* Save All Button */}
              <Button
                className="w-full"
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save All Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Log a Call */}
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-green-600" />
                Log a Call
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={callDate}
                    onChange={(e) => setCallDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Duration (min)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 15"
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Outcome</Label>
                <Select value={callOutcome} onValueChange={setCallOutcome}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Connected">Connected</SelectItem>
                    <SelectItem value="No Answer">No Answer</SelectItem>
                    <SelectItem value="Busy">Busy</SelectItem>
                    <SelectItem value="Voicemail">Voicemail</SelectItem>
                    <SelectItem value="Callback Requested">Callback Requested</SelectItem>
                    <SelectItem value="Interested">Interested</SelectItem>
                    <SelectItem value="Not Interested">Not Interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Notes <span className="text-red-500">*</span></Label>
                <Textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="What was discussed..."
                  rows={3}
                  className="mt-1 resize-none"
                />
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleLogCall}
                disabled={isLoggingCall || !callNotes.trim()}
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                {isLoggingCall ? "Saving..." : "Log Call"}
              </Button>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
              ) : (
                <div className="space-y-0">
                  {activities.map((act, idx) => {
                    const config = ACTIVITY_ICONS[act.type] || { icon: Activity, color: "text-gray-400" };
                    const Icon = config.icon;
                    const isLast = idx === activities.length - 1;
                    let callMeta: any = null;
                    if (act.type === "CALL_LOGGED" && act.metadata) {
                      try { callMeta = JSON.parse(act.metadata); } catch {}
                    }

                    return (
                      <div key={act.id} className="flex gap-3">
                        {/* Timeline line + icon */}
                        <div className="flex flex-col items-center">
                          <div className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center bg-background ${config.color.replace("text-", "border-")}`}>
                            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                          </div>
                          {!isLast && <div className="w-px flex-1 bg-border min-h-[16px]" />}
                        </div>

                        {/* Content */}
                        <div className={`pb-4 flex-1 ${isLast ? "" : ""}`}>
                          <p className="text-sm font-medium leading-tight">{act.description}</p>
                          {callMeta?.notes && (
                            <p className="text-xs text-muted-foreground mt-1 bg-muted rounded px-2 py-1">
                              {callMeta.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {act.performedBy && (
                              <span className="text-xs text-muted-foreground">{act.performedBy}</span>
                            )}
                            <span className="text-xs text-muted-foreground">&middot;</span>
                            <span className="text-xs text-muted-foreground">{formatActivityDate(act.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(inquiry.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span>{formatDate(inquiry.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inquiry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inquiry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
