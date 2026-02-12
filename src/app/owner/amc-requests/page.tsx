"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Eye, Trash2, Loader2, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AMCRequest {
  id: string;
  status: string;
  equipmentCategories: string[];
  kitchenType: string;
  planType: string;
  visitFrequency: string;
  preferredStartDate: string;
  notes: string | null;
  createdAt: string;
  restaurant: { id: string; name: string; city: string };
}

const statusColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  REQUESTED: "warning",
  SURVEY_SCHEDULED: "default",
  SURVEY_COMPLETED: "secondary",
  PROPOSAL_SENT: "default",
  PROPOSAL_ACCEPTED: "success",
  PROPOSAL_REJECTED: "destructive",
  CONTRACT_ACTIVE: "success",
  CANCELLED: "destructive",
};

const statusLabels: Record<string, string> = {
  REQUESTED: "Requested",
  SURVEY_SCHEDULED: "Survey Scheduled",
  SURVEY_COMPLETED: "Survey Completed",
  PROPOSAL_SENT: "Proposal Sent",
  PROPOSAL_ACCEPTED: "Proposal Accepted",
  PROPOSAL_REJECTED: "Proposal Rejected",
  CONTRACT_ACTIVE: "Contract Active",
  CANCELLED: "Cancelled",
};

const planLabels: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

const planColors: Record<string, string> = {
  BASIC: "bg-green-100 text-green-800",
  STANDARD: "bg-blue-100 text-blue-800",
  PREMIUM: "bg-purple-100 text-purple-800",
};

const frequencyLabels: Record<string, string> = {
  MONTHLY: "Monthly",
  BI_MONTHLY: "Bi-Monthly",
  QUARTERLY: "Quarterly",
};

export default function OwnerAMCRequestsPage() {
  const [requests, setRequests] = useState<AMCRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/owner/amc-requests");
      const data = await response.json();
      if (data.ok) {
        setRequests(data.data);
      } else {
        toast({ title: "Error", description: data.error || "Failed to fetch AMC requests", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch AMC requests", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCancel = async () => {
    if (!cancelId) return;
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/owner/amc-requests/${cancelId}`, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "AMC request cancelled" });
        fetchRequests();
      } else {
        toast({ title: "Error", description: data.error || "Failed to cancel", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to cancel request", variant: "destructive" });
    } finally {
      setIsCancelling(false);
      setCancelId(null);
    }
  };

  const filtered = filterStatus === "ALL" ? requests : requests.filter((r) => r.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            AMC Requests
          </h1>
          <p className="text-muted-foreground">View and manage your Annual Maintenance Contract requests</p>
        </div>
        <Button onClick={() => router.push("/owner/amc-request")}>
          <Plus className="mr-2 h-4 w-4" />
          New AMC Request
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="SURVEY_SCHEDULED">Survey Scheduled</SelectItem>
                <SelectItem value="SURVEY_COMPLETED">Survey Completed</SelectItem>
                <SelectItem value="PROPOSAL_SENT">Proposal Sent</SelectItem>
                <SelectItem value="PROPOSAL_ACCEPTED">Proposal Accepted</SelectItem>
                <SelectItem value="PROPOSAL_REJECTED">Proposal Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Showing {filtered.length} of {requests.length} requests
            </span>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading AMC requests...</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              {requests.length === 0 ? "No AMC requests yet" : "No requests match the filter"}
            </p>
            {requests.length === 0 && (
              <Button className="mt-4" onClick={() => router.push("/owner/amc-request")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First AMC Request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead className="hidden md:table-cell">Plan</TableHead>
                <TableHead className="hidden lg:table-cell">Frequency</TableHead>
                <TableHead className="hidden sm:table-cell">Categories</TableHead>
                <TableHead className="hidden md:table-cell">Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Requested</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    {req.restaurant.name}
                    <span className="block text-xs text-muted-foreground">{req.restaurant.city}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge className={planColors[req.planType] || ""}>
                      {planLabels[req.planType] || req.planType}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {frequencyLabels[req.visitFrequency] || req.visitFrequency}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {Array.isArray(req.equipmentCategories)
                      ? req.equipmentCategories.length
                      : 0}{" "}
                    types
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(req.preferredStartDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[req.status] || "default"}>
                      {statusLabels[req.status] || req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDate(req.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/owner/amc-requests/${req.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {req.status === "REQUESTED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCancelId(req.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary */}
      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{requests.length}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {requests.filter((r) => ["REQUESTED", "SURVEY_SCHEDULED", "SURVEY_COMPLETED", "PROPOSAL_SENT"].includes(r.status)).length}
                </p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {requests.filter((r) => ["PROPOSAL_ACCEPTED", "CONTRACT_ACTIVE"].includes(r.status)).length}
                </p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {requests.filter((r) => ["CANCELLED", "PROPOSAL_REJECTED"].includes(r.status)).length}
                </p>
                <p className="text-sm text-muted-foreground">Cancelled/Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel AMC Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this AMC request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>No, Keep It</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={isCancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isCancelling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</> : "Yes, Cancel Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
