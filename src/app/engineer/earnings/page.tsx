"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/commission";

type PayoutStatus = "PENDING" | "PAID" | "CANCELLED";

interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  paidAt: string | null;
  paymentNote: string | null;
  createdAt: string;
  assignment: {
    booking: {
      id: string;
      totalAmount: number;
      slotStartDateTime: string | null;
      restaurant: {
        id: string;
        name: string;
        address: string;
      };
    };
    commissionRate: number;
  };
}

interface Summary {
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  completedJobs: number;
  pendingPayouts: number;
}

interface SalaryPayoutRecord {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  paidAt: string | null;
  paymentNote: string | null;
  createdAt: string;
}

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface EarningsData {
  payoutMethod?: string;
  monthlySalary?: number;
  payouts: Payout[];
  salaryPayouts?: SalaryPayoutRecord[];
  summary: Summary;
}

export default function EngineerEarningsPage() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [salaryPayouts, setSalaryPayouts] = useState<SalaryPayoutRecord[]>([]);
  const [payoutMethod, setPayoutMethod] = useState<string>("COMMISSION");
  const [monthlySalary, setMonthlySalary] = useState<number>(0);
  const [summary, setSummary] = useState<Summary>({
    totalEarnings: 0,
    paidEarnings: 0,
    pendingEarnings: 0,
    completedJobs: 0,
    pendingPayouts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/engineer/earnings");
      const data = await response.json();

      if (data.ok) {
        setPayouts(data.data.payouts);
        setSalaryPayouts(data.data.salaryPayouts || []);
        setSummary(data.data.summary);
        setPayoutMethod(data.data.payoutMethod || "COMMISSION");
        setMonthlySalary(data.data.monthlySalary || 0);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch earnings",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch earnings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">Loading earnings...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Earnings</h1>
        <p className="text-muted-foreground mt-1">
          Track your completed jobs and earnings
        </p>
      </div>

      {payoutMethod === "SALARY" ? (
        <>
          {/* Salary-Based Summary */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Monthly Salary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 leading-tight break-all">
                  {formatAmount(monthlySalary)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold text-green-600 leading-tight break-all">
                  {formatAmount(summary.paidEarnings)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold text-yellow-600 leading-tight break-all">
                  {formatAmount(summary.pendingEarnings)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Completed Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold leading-tight">{summary.completedJobs}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Payout Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-blue-500 hover:bg-blue-600 text-sm">Fixed Salary</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Salary Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Salary Payment History ({salaryPayouts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {salaryPayouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No salary records yet. Admin will generate monthly salary payouts.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salaryPayouts.map((sp) => (
                        <TableRow key={sp.id}>
                          <TableCell className="font-medium">
                            {MONTH_NAMES[sp.month]} {sp.year}
                          </TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            {formatAmount(sp.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="default"
                              className={sp.status === "PAID" ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600"}
                            >
                              {sp.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sp.paidAt ? new Date(sp.paidAt).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {sp.paymentNote || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card for Salary */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">About Your Salary</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• You are on a fixed monthly salary of {formatAmount(monthlySalary)}</li>
                <li>• Your salary is not tied to individual job commissions</li>
                <li>• Admin generates monthly salary records and marks them as paid</li>
                <li>• Contact admin if you have questions about your salary</li>
              </ul>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Commission-Based Summary Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold leading-tight break-all">
                  {formatAmount(summary.totalEarnings)}
                </p>
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
                  {formatAmount(summary.paidEarnings)}
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
                  {formatAmount(summary.pendingEarnings)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Completed Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold leading-tight">{summary.completedJobs}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Pending Payouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-2xl font-bold leading-tight">{summary.pendingPayouts}</p>
              </CardContent>
            </Card>
          </div>

          {/* Earnings History */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings History ({payouts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No earnings yet. Complete jobs to start earning!
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>Service Date</TableHead>
                      <TableHead>Booking Amount</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead>Your Earnings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {payout.assignment.booking.restaurant.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {payout.assignment.booking.restaurant.address}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {payout.assignment.booking.slotStartDateTime
                            ? new Date(
                                payout.assignment.booking.slotStartDateTime
                              ).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {formatAmount(payout.assignment.booking.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {payout.assignment.commissionRate}%
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatAmount(payout.amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        <TableCell>
                          {payout.paidAt
                            ? new Date(payout.paidAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">About Earnings</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• You earn a commission on each completed job</li>
                <li>• Commission rate is typically 20% of the booking amount</li>
                <li>• Earnings show as &quot;Pending&quot; until admin processes the payment</li>
                <li>
                  • Once paid, you&apos;ll see the payment date and any admin notes
                </li>
                <li>
                  • Contact admin if you have questions about your payouts
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}