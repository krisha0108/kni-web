"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useRouter } from "next/navigation";
import {
  Clock,
  Eye,
  Wrench,
  CheckCircle,
  XCircle,
  MessageSquare,
  Search,
  RefreshCw,
} from "lucide-react";

type TicketStatus = "PENDING" | "SEEN" | "ON_WORK" | "REJECTED" | "COMPLETED";

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
  } | null;
  _count: {
    threads: number;
  };
}

interface Summary {
  total: number;
  pending: number;
  seen: number;
  onWork: number;
  completed: number;
  rejected: number;
}

export default function AdminSupportPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    pending: 0,
    seen: 0,
    onWork: 0,
    completed: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, page]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", page.toString());

      const response = await fetch(`/api/admin/support?${params}`);
      const data = await response.json();

      if (data.ok) {
        setTickets(data.data);
        setSummary(data.summary);
        setTotalPages(data.totalPages);
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

  const handleSearch = () => {
    setPage(1);
    fetchTickets();
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Ticket status updated",
        });
        fetchTickets();
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

  const getStatusBadge = (status: TicketStatus) => {
    const config = {
      PENDING: { variant: "default" as const, className: "bg-yellow-500 hover:bg-yellow-600", icon: Clock },
      SEEN: { variant: "default" as const, className: "bg-blue-500 hover:bg-blue-600", icon: Eye },
      ON_WORK: { variant: "default" as const, className: "bg-purple-500 hover:bg-purple-600", icon: Wrench },
      COMPLETED: { variant: "default" as const, className: "bg-green-500 hover:bg-green-600", icon: CheckCircle },
      REJECTED: { variant: "destructive" as const, className: "", icon: XCircle },
    };

    const { variant, className, icon: Icon } = config[status];

    return (
      <Badge variant={variant} className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer support tickets and inquiries
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Seen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{summary.seen}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">On Work</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{summary.onWork}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label>Search</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by title, owner name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button variant="outline" size="icon" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="min-w-[150px]">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SEEN">Seen</SelectItem>
                  <SelectItem value="ON_WORK">On Work</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Billing">Billing</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={fetchTickets}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tickets found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead className="hidden md:table-cell">Owner</TableHead>
                  <TableHead className="hidden lg:table-cell">Restaurant</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Replies</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className={ticket.status === "PENDING" ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}
                  >
                    <TableCell>
                      <div className="max-w-[250px]">
                        <div className="flex items-center gap-2">
                          {ticket.status === "PENDING" && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                            </span>
                          )}
                          <p className="font-medium truncate">{ticket.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {ticket.description}
                        </p>
                        {ticket.equipmentName && (
                          <p className="text-xs text-muted-foreground">
                            Equipment: {ticket.equipmentName}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        <p className="font-medium">{ticket.owner.name}</p>
                        <p className="text-sm text-muted-foreground">{ticket.owner.email}</p>
                        {ticket.owner.phone && (
                          <p className="text-xs text-muted-foreground">{ticket.owner.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {ticket.restaurant ? ticket.restaurant.name : "-"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{ticket.category}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        {ticket._count.threads}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">
                        <p>{formatDate(ticket.createdAt)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/support/${ticket.id}`)}
                        >
                          View
                        </Button>
                        <Select
                          value={ticket.status}
                          onValueChange={(v) => handleStatusChange(ticket.id, v as TicketStatus)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
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
                    </TableCell>
                  </TableRow>
                ))}
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
    </div>
  );
}
