"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MessageSquare, Clock, CheckCircle, AlertCircle, XCircle, Eye, Send, Phone, Trash2 } from "lucide-react";
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
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [threads, setThreads] = useState<TicketThread[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    equipmentName: "",
    category: "General",
    description: "",
  });

  useEffect(() => {
    fetchTickets();
  }, [selectedRestaurant, statusFilter]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedRestaurant) {
        params.append("restaurantId", selectedRestaurant.restaurantId);
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch("/api/owner/support?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setTickets(data.data || []);
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
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      setIsSending(true);
      const response = await fetch(`/api/owner/support/${selectedTicket.id}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      });

      const data = await response.json();
      if (data.ok) {
        setThreads([...threads, data.data]);
        setNewMessage("");
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
    if (!confirm("Are you sure you want to delete this ticket?")) return;

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
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-10">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Restaurant Selected</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Please select a restaurant to view support tickets
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-muted-foreground">
            Get help with your equipment and services
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="tel:+919999999999">
              <Phone className="h-4 w-4 mr-2" />
              Call Support
            </a>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of your issue"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="equipmentName">Equipment Name (Optional)</Label>
                  <Input
                    id="equipmentName"
                    value={formData.equipmentName}
                    onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                    placeholder="If related to specific equipment"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your issue in detail..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Ticket</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {STATUS_OPTIONS.slice(1).map((status) => {
          const config = getStatusConfig(status.value);
          const Icon = config.icon;
          return (
            <Card key={status.value} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(status.value)}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${status.value === statusFilter ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${status.value === statusFilter ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statusCounts[status.value] || 0}</p>
                    <p className="text-xs text-muted-foreground">{status.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets by title, ID, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Replies</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => {
                  const statusConfig = getStatusConfig(ticket.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openTicketDetail(ticket)}>
                      <TableCell className="font-mono text-sm">
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
                      <TableCell>
                        <Badge variant="outline">{ticket.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.color} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          {ticket._count.threads}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(ticket.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => openTicketDetail(ticket)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {ticket.status === "PENDING" && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTicket(ticket.id)}>
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
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Ticket #{selectedTicket?.id.slice(0, 8)}</span>
              {selectedTicket && (
                <Badge variant={getStatusConfig(selectedTicket.status).color}>
                  {getStatusConfig(selectedTicket.status).label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <>
              <div className="space-y-4 flex-1 overflow-y-auto">
                {/* Ticket Info */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h3 className="font-semibold">{selectedTicket.title}</h3>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Category: {selectedTicket.category}</span>
                    {selectedTicket.equipmentName && (
                      <span>Equipment: {selectedTicket.equipmentName}</span>
                    )}
                  </div>
                  <p className="text-sm">{selectedTicket.description}</p>
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
                        className={`p-3 rounded-lg ${
                          thread.isAdmin
                            ? "bg-primary/10 ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {thread.user.name}
                            {thread.isAdmin && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Support
                              </Badge>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(thread.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{thread.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reply Section */}
              {selectedTicket.status !== "COMPLETED" && selectedTicket.status !== "REJECTED" && (
                <div className="flex gap-2 pt-4 border-t">
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
                  />
                  <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
