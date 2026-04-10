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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/commission";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Users, Wallet, Plus } from "lucide-react";

type PayoutStatus = "PENDING" | "PAID" | "CANCELLED";

interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  paidAt: string | null;
  paymentNote: string | null;
  createdAt: string;
  engineer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  assignment: {
    booking: {
      id: string;
      totalAmount: number;
      restaurant: {
        id: string;
        name: string;
      };
    };
  };
}

interface SalaryPayout {
  id: string;
  engineerId: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  paidAt: string | null;
  paymentNote: string | null;
  createdAt: string;
  engineer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    engineerProfile: {
      city: string | null;
      monthlySalary: number | null;
    } | null;
  };
}

interface SalarySummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  pendingCount: number;
}

type TabType = "commission" | "salary";

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("commission");
  // Commission state
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const [isMarking, setIsMarking] = useState(false);
  // Salary state
  const [salaryPayouts, setSalaryPayouts] = useState<SalaryPayout[]>([]);
  const [salarySummary, setSalarySummary] = useState<SalarySummary>({ totalAmount: 0, paidAmount: 0, pendingAmount: 0, pendingCount: 0 });
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());
  const [salaryStatusFilter, setSalaryStatusFilter] = useState<string>("all");
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(new Date().getMonth() + 1);
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSalaryPayout, setSelectedSalaryPayout] = useState<SalaryPayout | null>(null);
  const [isSalaryMarkPaidOpen, setIsSalaryMarkPaidOpen] = useState(false);
  const [salaryPaymentNote, setSalaryPaymentNote] = useState("");
  const [isMarkingSalary, setIsMarkingSalary] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, [page]);

  useEffect(() => {
    if (activeTab === "salary") fetchSalaryPayouts();
  }, [activeTab, salaryMonth, salaryYear, salaryStatusFilter]);

  useEffect(() => {
    applyFilters();
  }, [payouts, statusFilter, searchQuery]);

  const fetchPayouts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/payouts?page=${page}&pageSize=20`);
      const data = await response.json();

      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setPayouts(items);
        setTotalPages(Math.ceil(total / 20) || 1);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch payouts",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch payouts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalaryPayouts = async () => {
    try {
      setSalaryLoading(true);
      const params = new URLSearchParams();
      params.set("month", salaryMonth.toString());
      params.set("year", salaryYear.toString());
      if (salaryStatusFilter !== "all") params.set("status", salaryStatusFilter);

      const response = await fetch(`/api/admin/salary-payouts?${params}`);
      const data = await response.json();

      if (data.ok) {
        setSalaryPayouts(data.data);
        setSalarySummary(data.summary);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch salary payouts", variant: "destructive" });
    } finally {
      setSalaryLoading(false);
    }
  };

  const handleGenerateSalary = async () => {
    try {
      setIsGenerating(true);
      const response = await fetch("/api/admin/salary-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: generateMonth, year: generateYear }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: data.message });
        setIsGenerateDialogOpen(false);
        setSalaryMonth(generateMonth);
        setSalaryYear(generateYear);
        fetchSalaryPayouts();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate salary payouts", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkSalaryPaid = async () => {
    if (!selectedSalaryPayout) return;
    try {
      setIsMarkingSalary(true);
      const response = await fetch(`/api/admin/salary-payouts/${selectedSalaryPayout.id}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentNote: salaryPaymentNote }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Salary marked as paid" });
        setIsSalaryMarkPaidOpen(false);
        setSalaryPaymentNote("");
        setSelectedSalaryPayout(null);
        fetchSalaryPayouts();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to mark salary as paid", variant: "destructive" });
    } finally {
      setIsMarkingSalary(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...payouts];

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.engineer.name.toLowerCase().includes(query) ||
          p.engineer.email.toLowerCase().includes(query) ||
          p.assignment.booking.restaurant.name.toLowerCase().includes(query)
      );
    }

    setFilteredPayouts(filtered);
  };

  const handleMarkAsPaid = async () => {
    if (!selectedPayout) return;

    try {
      setIsMarking(true);
      const response = await fetch(
        `/api/admin/payouts/${selectedPayout.id}/mark-paid`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentNote }),
        }
      );

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Payout marked as paid successfully",
        });
        setIsMarkPaidDialogOpen(false);
        setPaymentNote("");
        setSelectedPayout(null);
        fetchPayouts();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to mark payout as paid",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark payout as paid",
        variant: "destructive",
      });
    } finally {
      setIsMarking(false);
    }
  };

  const getStatusBadge = (status: PayoutStatus) => {
    const variants = {
      PENDING: "default" as const,
      PAID: "default" as const,
      CANCELLED: "destructive" as const,
    };

    const colors = {
      PENDING: "bg-yellow-500 hover:bg-yellow-600",
      PAID: "bg-green-500 hover:bg-green-600",
      CANCELLED: "",
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  const calculateSummary = () => {
    const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = payouts
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payouts
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingCount = payouts.filter((p) => p.status === "PENDING").length;

    return { totalAmount, paidAmount, pendingAmount, pendingCount };
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/exports/payouts");
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payouts-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Payouts exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export payouts",
        variant: "destructive",
      });
    }
  };

  const summary = calculateSummary();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">Loading payouts...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Engineer Payouts</h1>
          <p className="text-muted-foreground mt-1">
            Manage engineer commission payouts and salaries
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("commission")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "commission"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="h-4 w-4" />
          Commission Payouts ({payouts.length})
        </button>
        <button
          onClick={() => setActiveTab("salary")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "salary"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Salary Payouts
        </button>
      </div>

      {activeTab === "commission" ? (
        <>
          {/* Commission Summary Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold leading-tight break-all">{formatAmount(summary.totalAmount)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Paid Out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold text-green-600 leading-tight break-all">
                  {formatAmount(summary.paidAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Pending Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold text-yellow-600 leading-tight break-all">
                  {formatAmount(summary.pendingAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Pending Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold leading-tight">{summary.pendingCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label>Search</Label>
                  <Input
                    placeholder="Search by engineer or restaurant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="min-w-[180px]">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payouts Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Payouts ({filteredPayouts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPayouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No payouts found
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap px-2 sm:px-4">Engineer</TableHead>
                        <TableHead className="whitespace-nowrap px-2 sm:px-4">Restaurant</TableHead>
                        <TableHead className="whitespace-nowrap px-2 sm:px-4">Booking Amount</TableHead>
                        <TableHead className="whitespace-nowrap px-2 sm:px-4">Commission</TableHead>
                        <TableHead className="whitespace-nowrap px-2 sm:px-4">Status</TableHead>
                        <TableHead className="whitespace-nowrap px-2 sm:px-4">Created</TableHead>
                        <TableHead className="whitespace-nowrap px-2 sm:px-4">Paid Date</TableHead>
                        <TableHead className="whitespace-nowrap px-2 sm:px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell className="px-2 sm:px-4">
                            <div>
                              <p className="font-medium text-xs sm:text-sm">{payout.engineer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {payout.engineer.email}
                              </p>
                              {payout.engineer.phone && (
                                <p className="text-xs text-muted-foreground">
                                  {payout.engineer.phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm">
                            {payout.assignment.booking.restaurant.name}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm">
                            {formatAmount(payout.assignment.booking.totalAmount)}
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm">
                            {formatAmount(payout.amount)}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4">
                            {getStatusBadge(payout.status)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm">
                            {new Date(payout.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm">
                            {payout.paidAt
                              ? new Date(payout.paidAt).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4">
                            {payout.status === "PENDING" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedPayout(payout);
                                  setIsMarkPaidDialogOpen(true);
                                }}
                                className="text-xs sm:text-sm h-8"
                              >
                                Mark as Paid
                              </Button>
                            )}
                            {payout.status === "PAID" && payout.paymentNote && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  toast({
                                    title: "Payment Note",
                                    description: payout.paymentNote,
                                  });
                                }}
                                className="text-xs sm:text-sm h-8"
                              >
                                View Note
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4 p-4">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Salary Summary Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total for {MONTH_NAMES[salaryMonth]} {salaryYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold leading-tight break-all">{formatAmount(salarySummary.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-green-600">Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold text-green-600 leading-tight break-all">{formatAmount(salarySummary.paidAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-yellow-600">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold text-yellow-600 leading-tight break-all">{formatAmount(salarySummary.pendingAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pending Count</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold leading-tight">{salarySummary.pendingCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Salary Filters + Generate Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap items-end">
                <div className="min-w-[140px]">
                  <Label>Month</Label>
                  <Select value={salaryMonth.toString()} onValueChange={(v) => setSalaryMonth(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.slice(1).map((name, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[100px]">
                  <Label>Year</Label>
                  <Select value={salaryYear.toString()} onValueChange={(v) => setSalaryYear(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2025, 2026, 2027, 2028].map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[140px]">
                  <Label>Status</Label>
                  <Select value={salaryStatusFilter} onValueChange={setSalaryStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setIsGenerateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Monthly Salary
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Salary Payouts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Salary Payouts — {MONTH_NAMES[salaryMonth]} {salaryYear} ({salaryPayouts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {salaryLoading ? (
                <p className="text-center py-8">Loading...</p>
              ) : salaryPayouts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-3">No salary payouts for {MONTH_NAMES[salaryMonth]} {salaryYear}</p>
                  <Button variant="outline" onClick={() => { setGenerateMonth(salaryMonth); setGenerateYear(salaryYear); setIsGenerateDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Now
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-2 sm:px-4">Engineer</TableHead>
                        <TableHead className="px-2 sm:px-4">City</TableHead>
                        <TableHead className="px-2 sm:px-4">Monthly Salary</TableHead>
                        <TableHead className="px-2 sm:px-4">Status</TableHead>
                        <TableHead className="px-2 sm:px-4">Paid Date</TableHead>
                        <TableHead className="px-2 sm:px-4">Note</TableHead>
                        <TableHead className="px-2 sm:px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salaryPayouts.map((sp) => (
                        <TableRow key={sp.id}>
                          <TableCell className="px-2 sm:px-4">
                            <div>
                              <p className="font-medium text-xs sm:text-sm">{sp.engineer.name}</p>
                              <p className="text-xs text-muted-foreground">{sp.engineer.email}</p>
                              {sp.engineer.phone && <p className="text-xs text-muted-foreground">{sp.engineer.phone}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm">
                            {sp.engineer.engineerProfile?.city || "-"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4">
                            <span className="font-semibold text-blue-600 text-xs sm:text-sm">
                              {formatAmount(sp.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4">
                            <Badge
                              variant="default"
                              className={sp.status === "PAID" ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600"}
                            >
                              {sp.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-2 sm:px-4 text-xs sm:text-sm">
                            {sp.paidAt ? new Date(sp.paidAt).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 text-xs sm:text-sm max-w-[150px] truncate">
                            {sp.paymentNote || "-"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4">
                            {sp.status === "PENDING" && (
                              <Button
                                size="sm"
                                onClick={() => { setSelectedSalaryPayout(sp); setIsSalaryMarkPaidOpen(true); }}
                                className="text-xs sm:text-sm h-8"
                              >
                                Mark as Paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Commission Mark as Paid Dialog */}
      <Dialog open={isMarkPaidDialogOpen} onOpenChange={setIsMarkPaidDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark Payout as Paid</DialogTitle>
            <DialogDescription>
              Confirm that you have paid this engineer. Add optional payment notes.
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Engineer:</span>
                  <span className="text-sm">{selectedPayout.engineer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="text-sm font-semibold">
                    {formatAmount(selectedPayout.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Restaurant:</span>
                  <span className="text-sm">
                    {selectedPayout.assignment.booking.restaurant.name}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-note">Payment Note (Optional)</Label>
                <Textarea
                  id="payment-note"
                  placeholder="Enter payment details, transaction ID, etc..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMarkPaidDialogOpen(false);
                setPaymentNote("");
                setSelectedPayout(null);
              }}
              disabled={isMarking}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={isMarking}>
              {isMarking ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Monthly Salary Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Monthly Salary Payouts</DialogTitle>
            <DialogDescription>
              Create salary payout records for all active salary-based engineers for the selected month.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={generateMonth.toString()} onValueChange={(v) => setGenerateMonth(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.slice(1).map((name, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={generateYear.toString()} onValueChange={(v) => setGenerateYear(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2025, 2026, 2027, 2028].map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                This will create PENDING salary payout records for all active salary-based engineers
                who don&apos;t already have a record for <strong>{MONTH_NAMES[generateMonth]} {generateYear}</strong>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGenerateDialogOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateSalary} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Payouts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Mark as Paid Dialog */}
      <Dialog open={isSalaryMarkPaidOpen} onOpenChange={setIsSalaryMarkPaidOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark Salary as Paid</DialogTitle>
            <DialogDescription>
              Confirm salary payment for this engineer. Add optional payment notes.
            </DialogDescription>
          </DialogHeader>

          {selectedSalaryPayout && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Engineer:</span>
                  <span className="text-sm">{selectedSalaryPayout.engineer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{selectedSalaryPayout.engineer.email}</span>
                </div>
                {selectedSalaryPayout.engineer.phone && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Phone:</span>
                    <span className="text-sm">{selectedSalaryPayout.engineer.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Month:</span>
                  <span className="text-sm">{MONTH_NAMES[selectedSalaryPayout.month]} {selectedSalaryPayout.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Salary Amount:</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {formatAmount(selectedSalaryPayout.amount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary-payment-note">Payment Note (Optional)</Label>
                <Textarea
                  id="salary-payment-note"
                  placeholder="Enter payment details, transaction ID, bank reference..."
                  value={salaryPaymentNote}
                  onChange={(e) => setSalaryPaymentNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSalaryMarkPaidOpen(false);
                setSalaryPaymentNote("");
                setSelectedSalaryPayout(null);
              }}
              disabled={isMarkingSalary}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkSalaryPaid} disabled={isMarkingSalary}>
              {isMarkingSalary ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}