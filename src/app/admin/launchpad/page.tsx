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
  Search,
  RefreshCw,
  Download,
  Rocket,
} from "lucide-react";

type InquiryStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "NEGOTIATION" | "WON" | "LOST" | "ON_HOLD";
type InquiryPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type BusinessType = "RESTAURANT" | "CAFE" | "CLOUD_KITCHEN" | "QSR" | "BAKERY" | "CATERING" | "OTHER";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  businessType: BusinessType;
  businessName: string | null;
  budgetRange: string | null;
  areaInSqFt: number | null;
  timeline: string | null;
  status: InquiryStatus;
  priority: InquiryPriority;
  createdAt: string;
  assignedTo: string | null;
}

interface Summary {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  proposalSent: number;
  won: number;
  lost: number;
}

const STATUS_COLORS: Record<InquiryStatus, string> = {
  NEW: "bg-yellow-500 hover:bg-yellow-600",
  CONTACTED: "bg-blue-500 hover:bg-blue-600",
  QUALIFIED: "bg-purple-500 hover:bg-purple-600",
  PROPOSAL_SENT: "bg-indigo-500 hover:bg-indigo-600",
  NEGOTIATION: "bg-orange-500 hover:bg-orange-600",
  WON: "bg-green-500 hover:bg-green-600",
  LOST: "bg-red-500 hover:bg-red-600",
  ON_HOLD: "bg-gray-500 hover:bg-gray-600",
};

const PRIORITY_COLORS: Record<InquiryPriority, string> = {
  LOW: "bg-gray-400",
  MEDIUM: "bg-blue-400",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-600",
};

const BUDGET_LABELS: Record<string, string> = {
  UNDER_5L: "Under 5L",
  L5_TO_10L: "5L - 10L",
  L10_TO_25L: "10L - 25L",
  L25_TO_50L: "25L - 50L",
  L50_TO_1CR: "50L - 1Cr",
  ABOVE_1CR: "Above 1Cr",
};

const TIMELINE_LABELS: Record<string, string> = {
  IMMEDIATELY: "Immediately",
  WITHIN_1_MONTH: "Within 1 Month",
  WITHIN_3_MONTHS: "Within 3 Months",
  WITHIN_6_MONTHS: "Within 6 Months",
  WITHIN_1_YEAR: "Within 1 Year",
  JUST_EXPLORING: "Just Exploring",
};

export default function AdminLaunchPadPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0, new: 0, contacted: 0, qualified: 0, proposalSent: 0, won: 0, lost: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchInquiries();
  }, [statusFilter, priorityFilter, businessTypeFilter, page]);

  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (businessTypeFilter !== "all") params.set("businessType", businessTypeFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", page.toString());

      const response = await fetch(`/api/admin/launchpad?${params}`);
      const data = await response.json();

      if (data.ok) {
        setInquiries(data.data);
        setSummary(data.summary);
        setTotalPages(data.totalPages);
      } else {
        toast({ title: "Error", description: data.error || "Failed to fetch inquiries", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch inquiries", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchInquiries();
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "City", "Business Type", "Budget", "Timeline", "Status", "Priority", "Date"];
    const rows = inquiries.map((i) => [
      i.name, i.email, i.phone, i.city,
      i.businessType.replace("_", " "),
      i.budgetRange ? BUDGET_LABELS[i.budgetRange] || i.budgetRange : "",
      i.timeline ? TIMELINE_LABELS[i.timeline] || i.timeline : "",
      i.status, i.priority,
      new Date(i.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `launchpad-inquiries-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            Launch Pad Inquiries
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage new business setup inquiries and leads
          </p>
        </div>
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
            <CardTitle className="text-sm font-medium text-yellow-600">New</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{summary.new}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Contacted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{summary.contacted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{summary.qualified}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600">Proposal Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600">{summary.proposalSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Won</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{summary.won}</p>
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
                  placeholder="Search by name, email, phone, city..."
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
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

            <div className="min-w-[130px]">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <Label>Business Type</Label>
              <Select value={businessTypeFilter} onValueChange={(v) => { setBusinessTypeFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                  <SelectItem value="CAFE">Cafe</SelectItem>
                  <SelectItem value="CLOUD_KITCHEN">Cloud Kitchen</SelectItem>
                  <SelectItem value="QSR">QSR</SelectItem>
                  <SelectItem value="BAKERY">Bakery</SelectItem>
                  <SelectItem value="CATERING">Catering</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={fetchInquiries}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inquiries ({inquiries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : inquiries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No inquiries found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead className="hidden md:table-cell">City</TableHead>
                  <TableHead className="hidden sm:table-cell">Business Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Budget</TableHead>
                  <TableHead className="hidden lg:table-cell">Timeline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Priority</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry) => (
                  <TableRow
                    key={inquiry.id}
                    className={inquiry.status === "NEW" ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}
                  >
                    <TableCell>
                      <div className="max-w-[200px]">
                        <div className="flex items-center gap-2">
                          {inquiry.status === "NEW" && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                            </span>
                          )}
                          <p className="font-medium truncate">{inquiry.name}</p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{inquiry.email}</p>
                        <p className="text-xs text-muted-foreground">{inquiry.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{inquiry.city}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{inquiry.businessType.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {inquiry.budgetRange ? BUDGET_LABELS[inquiry.budgetRange] || inquiry.budgetRange : "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {inquiry.timeline ? TIMELINE_LABELS[inquiry.timeline] || inquiry.timeline : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[inquiry.status]}>
                        {inquiry.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge className={PRIORITY_COLORS[inquiry.priority]}>
                        {inquiry.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatDate(inquiry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/launchpad/${inquiry.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

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
