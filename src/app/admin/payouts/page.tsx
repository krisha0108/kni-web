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
import { Download } from "lucide-react";

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

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [payouts, statusFilter, searchQuery]);

  const fetchPayouts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/payouts");
      const data = await response.json();

      if (data.ok) {
        setPayouts(data.data);
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
            Manage engineer commission payouts
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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

      {/* Mark as Paid Dialog */}
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
    </div>
  );
}