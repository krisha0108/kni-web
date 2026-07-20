"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MessageSquare, Clock, CheckCircle, AlertCircle, XCircle, Eye, Send, Phone, Trash2, Upload, X, ImageIcon } from "lucide-react";
import { useRestaurant } from "@/contexts/restaurant-context";
import { formatDate } from "@/lib/utils";

interface SupportTicket {
  id: string;
  title: string;
  equipmentName: string | null;
  category: string;
  description: string;
  status: "PENDING" | "SEEN" | "ON_WORK" | "REJECTED" | "COMPLETED";
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: {
    id: string;
    name: string;
  } | null;
  _count: {
    threads: number;
  };
}

interface TicketThread {
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

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "SEEN", label: "Seen" },
  { value: "ON_WORK", label: "On Work" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
];

const CATEGORY_OPTIONS = [
  "General",
  "Equipment",
  "Billing",
  "Service",
  "Account",
  "Other",
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case "PENDING":
      return { color: "warning" as const, icon: Clock, label: "Pending" };
    case "SEEN":
      return { color: "secondary" as const, icon: Eye, label: "Seen" };
    case "ON_WORK":
      return { color: "default" as const, icon: AlertCircle, label: "On Work" };
    case "COMPLETED":
      return { color: "success" as const, icon: CheckCircle, label: "Completed" };
    case "REJECTED":
      return { color: "destructive" as const, icon: XCircle, label: "Rejected" };
    default:
      return { color: "secondary" as const, icon: Clock, label: status };
  }
};

export default function OwnerSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [threads, setThreads] = useState<TicketThread[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [ticketImageUrl, setTicketImageUrl] = useState("");
  const [replyImageUrl, setReplyImageUrl] = useState("");
  const [isUploadingTicketImage, setIsUploadingTicketImage] = useState(false);
  const [isUploadingReplyImage, setIsUploadingReplyImage] = useState(false);
  const ticketFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

  const userRole = selectedRestaurant?.role;
  const canCreate = userRole === "OWNER" || userRole === "MANAGER";

  const [formData, setFormData] = useState({
    title: "",
    equipmentName: "",
    category: "General",
    description: "",
  });

  useEffect(() => {
    fetchTickets();
  }, [selectedRestaurant, statusFilter, page]);

  const fetchTickets = async () => {
    if (!selectedRestaurant?.restaurantId) {
      setTickets([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("restaurantId", selectedRestaurant.restaurantId);
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      params.set("page", page.toString());
      params.set("pageSize", "20");

      const response = await fetch("/api/owner/support?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || data.total || 0;
        const pSize = data.data?.pageSize || 20;
        setTickets(Array.isArray(items) ? items : []);
        setTotalPages(data.totalPages || Math.ceil(total / pSize) || 1);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch tickets",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTicketDetail = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/owner/support/${ticketId}`);
      const data = await response.json();
      if (data.ok) {
        setSelectedTicket(data.data);
        setThreads(data.data.threads || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch ticket details",
        variant: "destructive",
      });
    }
  };

  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;
    const query = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
    );
  }, [tickets, searchQuery]);

  const resetForm = () => {
    setFormData({
      title: "",
      equipmentName: "",
      category: "General",
      description: "",
    });
    setTicketImageUrl("");
  };

  const handleImageUpload = async (
    file: File,
    setUrl: (url: string) => void,
    setLoading: (loading: boolean) => void
  ) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "support-tickets");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.ok) {
        setUrl(data.url);
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
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.title || !formData.description) {
        toast({
          title: "Error",
          description: "Please fill in title and description",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        restaurantId: selectedRestaurant?.restaurantId,
        title: formData.title,
        equipmentName: formData.equipmentName || undefined,
        category: formData.category,
        description: formData.description,
        photoUrl: ticketImageUrl || undefined,
      };

      const response = await fetch("/api/owner/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Support ticket created successfully",
        });
        setIsCreateOpen(false);
        resetForm();
        fetchTickets();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create ticket",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || (!newMessage.trim() && !replyImageUrl)) return;

    try {
      setIsSending(true);
      const payload: { message: string; imageUrl?: string } = {
        message: newMessage || "Image attached",
      };
      if (replyImageUrl) {
        payload.imageUrl = replyImageUrl;
      }
      const response = await fetch(`/api/owner/support/${selectedTicket.id}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        setThreads([...threads, data.data]);
        setNewMessage("");
        setReplyImageUrl("");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/owner/support/${ticketId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Ticket deleted successfully",
        });
        fetchTickets();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete ticket",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
      });
    }
  };

  const openTicketDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyImageUrl("");
    setNewMessage("");
    fetchTicketDetail(ticket.id);
    setIsDetailOpen(true);
  };

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [tickets]);

  if (!selectedRestaurant) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 sm:py-10">
              <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold">No Restaurant Selected</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1 text-center">
                Please select a restaurant to view support tickets
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight">Support Center</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Get help with your equipment and services
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <a href="tel:+919999999999">
              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              <span className="hidden sm:inline">Call Support</span>
              <span className="sm:hidden">Call</span>
            </a>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            {canCreate && (
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">New Ticket</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Create Support Ticket</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="text-xs sm:text-sm">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of your issue"
                    className="text-xs sm:text-sm h-9 sm:h-10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category" className="text-xs sm:text-sm">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs sm:text-sm">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="equipmentName" className="text-xs sm:text-sm">Equipment Name (Optional)</Label>
                  <Input
                    id="equipmentName"
                    value={formData.equipmentName}
                    onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                    placeholder="If related to specific equipment"
                    className="text-xs sm:text-sm h-9 sm:h-10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-xs sm:text-sm">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs sm:text-sm">Attachment (Optional)</Label>
                  <input
                    type="file"
                    ref={ticketFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, setTicketImageUrl, setIsUploadingTicketImage);
                      e.target.value = "";
                    }}
                  />
                  {ticketImageUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={ticketImageUrl}
                        alt="Attachment preview"
                        className="h-20 w-auto sm:h-24 rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6"
                        onClick={() => setTicketImageUrl("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => ticketFileInputRef.current?.click()}
                      disabled={isUploadingTicketImage}
                      className="text-xs sm:text-sm"
                    >
                      {isUploadingTicketImage ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                      )}
                      Upload Image
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter className="flex gap-2 flex-row-reverse">
                <Button onClick={handleCreate} size="sm">Create Ticket</Button>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} size="sm">
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        {STATUS_OPTIONS.slice(1).map((status) => {
          const config = getStatusConfig(status.value);
          const Icon = config.icon;
          return (
            <Card key={status.value} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter(status.value); setPage(1); }}>
              <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-2 rounded-lg ${status.value === statusFilter ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${status.value === statusFilter ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="text-center min-w-0">
                    <p className="text-lg sm:text-2xl font-bold leading-tight">{statusCounts[status.value] || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{status.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-9 h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Tickets ({filteredTickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Tickets Found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {statusFilter !== "all" ? "Try changing the filter" : "Create your first support ticket"}
              </p>
            </div>
          ) : (
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden md:table-cell">Ticket ID</TableHead>
                  <TableHead>Title</TableHead>
                  
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Replies</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {filteredTickets.map((ticket) => {
                  const statusConfig = getStatusConfig(ticket.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    
                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openTicketDetail(ticket)}>
                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        #{ticket.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ticket.title}</p>
                          {ticket.equipmentName && (
                            <p className="text-xs text-muted-foreground">{ticket.equipmentName}</p>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{ticket.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.color} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          {ticket._count.threads}
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {formatDate(ticket.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => openTicketDetail(ticket)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {ticket.status === "PENDING" && canCreate && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTicketId(ticket.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <span className="text-base sm:text-lg">Ticket #{selectedTicket?.id.slice(0, 8)}</span>
              {selectedTicket && (
                <Badge variant={getStatusConfig(selectedTicket.status).color} className="text-xs sm:text-sm w-fit">
                  {getStatusConfig(selectedTicket.status).label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <>
              <div className="space-y-4 flex-1 overflow-y-auto">
                {/* Ticket Info */}
                <div className="p-3 sm:p-4 bg-muted rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm sm:text-base">{selectedTicket.title}</h3>
                  <div className="flex flex-col sm:flex-row sm:gap-4 gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span className="line-clamp-1">Category: {selectedTicket.category}</span>
                    {selectedTicket.equipmentName && (
                      <span className="line-clamp-1">Equipment: {selectedTicket.equipmentName}</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm">{selectedTicket.description}</p>
                  {selectedTicket.photoUrl && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Attachment
                      </p>
                      <img
                        src={selectedTicket.photoUrl}
                        alt="Ticket attachment"
                        className="rounded-lg border max-w-full max-h-40 cursor-pointer"
                        onClick={() => window.open(selectedTicket.photoUrl!, "_blank")}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created: {formatDate(selectedTicket.createdAt)}
                  </p>
                </div>

                {/* Thread Messages */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {threads.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    threads.map((thread) => (
                      <div
                        key={thread.id}
                        className={`p-2 sm:p-3 rounded-lg ${
                          thread.isAdmin
                            ? "bg-primary/10 ml-2 sm:ml-8"
                            : "bg-muted mr-2 sm:mr-8"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-1 sm:gap-0">
                          <span className="text-xs sm:text-sm font-medium">
                            {thread.user.name}
                            {thread.isAdmin && (
                              <Badge variant="secondary" className="ml-2 text-[10px] sm:text-xs">
                                Support
                              </Badge>
                            )}
                          </span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatDate(thread.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm">{thread.message}</p>
                        {thread.imageUrl && (
                          <img
                            src={thread.imageUrl}
                            alt="Attachment"
                            className="mt-2 rounded-lg max-w-full max-h-40 object-cover cursor-pointer"
                            onClick={() => window.open(thread.imageUrl!, "_blank")}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reply Section */}
              {selectedTicket.status !== "COMPLETED" && selectedTicket.status !== "REJECTED" && (
                <div className="pt-3 sm:pt-4 border-t space-y-2">
                  {/* Image Preview */}
                  {replyImageUrl && (
                    <div className="relative inline-block">
                      <img
                        src={replyImageUrl}
                        alt="Upload preview"
                        className="h-14 sm:h-16 w-auto rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => setReplyImageUrl("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-1 sm:gap-2">
                    <input
                      type="file"
                      ref={replyFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, setReplyImageUrl, setIsUploadingReplyImage);
                        e.target.value = "";
                      }}
                    />
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 sm:h-10 w-9 sm:w-10"
                      onClick={() => replyFileInputRef.current?.click()}
                      disabled={isUploadingReplyImage}
                    >
                      {isUploadingReplyImage ? (
                        <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                    <Button onClick={handleSendMessage} disabled={isSending || (!newMessage.trim() && !replyImageUrl)} className="h-9 sm:h-10 px-2 sm:px-4">
                      <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTicketId} onOpenChange={(open) => !open && setDeleteTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTicketId) handleDeleteTicket(deleteTicketId);
                setDeleteTicketId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}