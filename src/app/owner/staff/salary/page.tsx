"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/contexts/restaurant-context";
import { DollarSign, CalendarDays, TrendingUp, Users, Trash2, Plus } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface SalaryRecord {
  id: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  totalPayable: number;
  totalPaid: number;
  status: "PENDING" | "PARTIAL" | "PAID";
  staff: {
    id: string;
    name: string;
    designation: string;
    staffType: string;
  };
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const statusColors: Record<string, "default" | "success" | "warning"> = {
  PENDING: "warning",
  PARTIAL: "default",
  PAID: "success",
};

const statusLabels = {
  PENDING: "Pending",
  PARTIAL: "Partially Paid",
  PAID: "Paid",
};

export default function StaffSalaryPage() {
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  const { toast } = useToast();
  const { selectedRestaurant } = useRestaurant();

  useEffect(() => {
    if (selectedRestaurant) {
      fetchSalaryRecords();
    }
  }, [selectedRestaurant, selectedMonth, selectedYear]);

  const fetchSalaryRecords = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        restaurantId: selectedRestaurant.restaurantId,
        month: selectedMonth,
        year: selectedYear,
      });

      const response = await fetch(`/api/owner/staff-salary?${params}`);
      const data = await response.json();

      if (data.ok) {
        setSalaryRecords(data.data || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch salary records",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch salary records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSalary = async () => {
    if (!selectedRestaurant) return;

    const monthName = monthNames[parseInt(selectedMonth) - 1];
    if (!confirm(`Generate salary for all active staff for ${monthName} ${selectedYear}?`)) {
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/owner/staff-salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.restaurantId,
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: data.message || "Salary generated successfully",
        });
        fetchSalaryRecords();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to generate salary",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate salary",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const openPaymentDialog = (record: SalaryRecord) => {
    setSelectedRecord(record);
    const remaining = (record.totalPayable - record.totalPaid) / 100;
    setPaymentAmount(remaining.toFixed(2));
    setIsPaymentDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedRecord) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    const remainingAmount = (selectedRecord.totalPayable - selectedRecord.totalPaid) / 100;
    if (amount > remainingAmount) {
      toast({
        title: "Error",
        description: `Payment amount cannot exceed remaining amount (${formatPrice(selectedRecord.totalPayable - selectedRecord.totalPaid)})`,
        variant: "destructive",
      });
      return;
    }

    setIsRecordingPayment(true);

    try {
      const response = await fetch(`/api/owner/staff-salary/${selectedRecord.id}?action=payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaid: amount,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: data.message || "Payment recorded successfully",
        });
        setIsPaymentDialogOpen(false);
        setSelectedRecord(null);
        setPaymentAmount("");
        fetchSalaryRecords();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to record payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDeleteRecord = async (recordId: string, staffName: string) => {
    if (!confirm(`Delete salary record for ${staffName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/owner/staff-salary/${recordId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Salary record deleted successfully",
        });
        fetchSalaryRecords();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete salary record",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete salary record",
        variant: "destructive",
      });
    }
  };

  const calculateSummary = () => {
    const totalPayable = salaryRecords.reduce((sum, record) => sum + record.totalPayable, 0);
    const totalPaid = salaryRecords.reduce((sum, record) => sum + record.totalPaid, 0);
    const totalPending = totalPayable - totalPaid;
    const staffCount = salaryRecords.length;

    return { totalPayable, totalPaid, totalPending, staffCount };
  };

  const summary = calculateSummary();

  if (!selectedRestaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a restaurant first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Staff Salary</h1>
        <p className="text-muted-foreground">Generate and manage staff salary payments</p>
      </div>

      {/* Filters and Generate Button */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerateSalary}
                disabled={isGenerating || salaryRecords.length > 0}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate Salary"}
              </Button>
            </div>
          </div>
          {salaryRecords.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Salary already generated for this period. Select a different month/year to generate.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {salaryRecords.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Count</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.staffCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(summary.totalPayable)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatPrice(summary.totalPaid)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <CalendarDays className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatPrice(summary.totalPending)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Salary Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Salary Records for {monthNames[parseInt(selectedMonth) - 1]} {selectedYear}
          </CardTitle>
          <CardDescription>
            {salaryRecords.length > 0
              ? `${salaryRecords.length} staff member(s)`
              : "No salary records found"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading salary records...</p>
            </div>
          ) : salaryRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No salary generated for this period. Click "Generate Salary" to create records for all active staff.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Total Payable</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryRecords.map((record) => {
                  const remaining = record.totalPayable - record.totalPaid;
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.staff.name}</TableCell>
                      <TableCell>{record.staff.designation}</TableCell>
                      <TableCell>{formatPrice(record.basicSalary)}</TableCell>
                      <TableCell>
                        {record.allowances > 0 ? formatPrice(record.allowances) : "-"}
                      </TableCell>
                      <TableCell>
                        {record.deductions > 0 ? formatPrice(record.deductions) : "-"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatPrice(record.totalPayable)}
                      </TableCell>
                      <TableCell>
                        {record.totalPaid > 0 ? formatPrice(record.totalPaid) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[record.status]}>
                          {statusLabels[record.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.status !== "PAID" && (
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(record)}
                            >
                              Pay {formatPrice(remaining)}
                            </Button>
                          )}
                          {record.totalPaid === 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteRecord(record.id, record.staff.name)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record salary payment for {selectedRecord?.staff.name}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Payable</p>
                  <p className="font-semibold">{formatPrice(selectedRecord.totalPayable)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Already Paid</p>
                  <p className="font-semibold">{formatPrice(selectedRecord.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-semibold text-orange-600">
                    {formatPrice(selectedRecord.totalPayable - selectedRecord.totalPaid)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">
                  Payment Amount (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter full amount for complete payment or partial amount
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false);
                setSelectedRecord(null);
                setPaymentAmount("");
              }}
              disabled={isRecordingPayment}
            >
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={isRecordingPayment}>
              {isRecordingPayment ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
