"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  Eye,
  Wrench,
  CheckCircle,
  XCircle,
  Send,
  User,
  Building,
  Mail,
  Phone,
  ImageIcon,
  Upload,
  X,
} from "lucide-react";

type TicketStatus = "PENDING" | "SEEN" | "ON_WORK" | "REJECTED" | "COMPLETED";

interface Thread {
  id: string;
  message: string;
  imageUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  category: string;
  equipmentName: string | null;
  status: TicketStatus;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  restaurant: {
    id: string;
    name: string;
    city: string;
  } | null;
  threads: Thread[];
}

export default function AdminSupportTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImageUrl, setReplyImageUrl] = useState("");
  const [isSending, setSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticketId = params.id as string;

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.threads]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchTicket = async (showStatusToast = false) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/support/${ticketId}`);
      const data = await response.json();

      if (data.ok) {
        // Check if status was auto-updated (PENDING → SEEN)
        if (showStatusToast && ticket?.status === "PENDING" && data.data.status === "SEEN") {
          toast({
            title: "Status Updated",
            description: "Ticket marked as SEEN automatically",
          });
        }
        setTicket(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch ticket",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch ticket",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.ok) {
        setTicket((prev) => prev ? { ...prev, status: newStatus } : null);
        toast({
          title: "Success",
          description: "Status updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "support-tickets");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.ok) {
        setReplyImageUrl(data.url);
        toast({ title: "Success", description: "Image uploaded successfully" });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() && !replyImageUrl) return;

    const previousStatus = ticket?.status;

    try {
      setSending(true);
      const payload: { message: string; imageUrl?: string } = {
        message: replyMessage || "Image attached",
      };
      if (replyImageUrl) {
        payload.imageUrl = replyImageUrl;
      }
      const response = await fetch(`/api/admin/support/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ok) {
        setReplyMessage("");
        setReplyImageUrl("");
        await fetchTicket();

        // Show appropriate toast based on status change
        if (previousStatus === "PENDING" || previousStatus === "SEEN") {
          toast({
            title: "Reply Sent",
            description: "Reply sent and status updated to ON WORK",
          });
        } else {
          toast({
            title: "Success",
            description: "Reply sent successfully",
          });
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send reply",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    const config = {
      PENDING: { className: "bg-yellow-500 hover:bg-yellow-600", icon: Clock },
      SEEN: { className: "bg-blue-500 hover:bg-blue-600", icon: Eye },
      ON_WORK: { className: "bg-purple-500 hover:bg-purple-600", icon: Wrench },
      COMPLETED: { className: "bg-green-500 hover:bg-green-600", icon: CheckCircle },
      REJECTED: { className: "bg-red-500 hover:bg-red-600", icon: XCircle },
    };

    const { className, icon: Icon } = config[status];

    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">Loading ticket...</CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">Ticket not found</CardContent>
        </Card>
      </div>
    );
  }

  const isTicketClosed = ticket.status === "COMPLETED" || ticket.status === "REJECTED";

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
            <p className="text-muted-foreground">
              Ticket #{ticket.id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {getStatusBadge(ticket.status)}
          <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as TicketStatus)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SEEN">Seen</SelectItem>
              <SelectItem value="ON_WORK">On Work</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Owner Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Owner Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{ticket.owner.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{ticket.owner.email}</span>
              </div>
              {ticket.owner.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{ticket.owner.phone}</span>
                </div>
              )}
              {ticket.restaurant && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {ticket.restaurant.name}
                    {ticket.restaurant.city && ` (${ticket.restaurant.city})`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="outline">{ticket.category}</Badge>
              </div>
              {ticket.equipmentName && (
                <div>
                  <p className="text-sm text-muted-foreground">Equipment</p>
                  <p>{ticket.equipmentName}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p>{formatDate(ticket.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
              {ticket.photoUrl && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    Attachment
                  </p>
                  <img
                    src={ticket.photoUrl}
                    alt="Ticket attachment"
                    className="rounded-lg border max-w-full h-auto"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Section */}
        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-220px)] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {ticket.threads.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation by sending a reply.
                </div>
              ) : (
                ticket.threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`flex ${thread.isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        thread.isAdmin
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {thread.user.name}
                          {thread.isAdmin && " (Admin)"}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{thread.message}</p>
                      {thread.imageUrl && (
                        <img
                          src={thread.imageUrl}
                          alt="Attachment"
                          className="mt-2 rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
                          onClick={() => window.open(thread.imageUrl!, "_blank")}
                        />
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          thread.isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {formatDate(thread.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Reply Input */}
            <div className="border-t p-4">
              {isTicketClosed ? (
                <div className="text-center text-muted-foreground py-2">
                  This ticket is closed. Change status to reply.
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Image Preview */}
                  {replyImageUrl && (
                    <div className="relative inline-block">
                      <img
                        src={replyImageUrl}
                        alt="Upload preview"
                        className="h-20 w-auto rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setReplyImageUrl("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1 flex gap-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        rows={2}
                        className="resize-none flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2 self-end">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        onClick={handleSendReply}
                        disabled={(!replyMessage.trim() && !replyImageUrl) || isSending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}