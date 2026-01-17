"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Clock, Phone, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { RejectionReasonInput } from "@/components/rejection-reason-input";

interface Job {
  id: string;
  status: string;
  assignedAt: string;
  booking: {
    id: string;
    status: string;
    scheduledDate?: string;
    scheduledTimeSlot?: string;
    preferredDate: string;
    preferredTimeSlot: string;
    restaurant: { id: string; name: string; address: string; city: string };
    owner: { id: string; name: string; phone: string };
    items: Array<{
      id: string;
      quantity: number;
      serviceItem?: { id: string; name: string };
      partItem?: { id: string; name: string };
    }>;
  };
  workLog?: {
    id: string;
    startedAt?: string;
    completedAt?: string;
  };
}

const statusColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  PENDING: "warning",
  ACCEPTED: "default",
  REJECTED: "destructive",
  IN_PROGRESS: "default",
  COMPLETED: "success",
};

export default function EngineerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const { toast} = useToast();
  const router = useRouter();

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/engineer/jobs");
      const data = await response.json();
      if (data.ok) {
        setJobs(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleAccept = async (jobId: string) => {
    try {
      const response = await fetch("/api/engineer/jobs/" + jobId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Job accepted" });
        fetchJobs();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to accept job", variant: "destructive" });
    }
  };

  const openRejectDialog = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsRejectDialogOpen(true);
    setRejectionReason("");
    setRejectionError("");
  };

  const handleReject = async () => {
    if (!selectedJobId) return;

    // Validate rejection reason
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      setRejectionError("Rejection reason must be at least 10 characters");
      return;
    }

    setIsRejecting(true);
    setRejectionError("");

    try {
      const response = await fetch("/api/engineer/jobs/" + selectedJobId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectionReason: rejectionReason.trim(),
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Job rejected successfully" });
        setIsRejectDialogOpen(false);
        setSelectedJobId(null);
        setRejectionReason("");
        fetchJobs();
      } else {
        setRejectionError(data.error || "Failed to reject job");
      }
    } catch {
      setRejectionError("Failed to reject job");
    } finally {
      setIsRejecting(false);
    }
  };

  const filterJobs = (status: string) => {
    if (status === "pending") {
      return jobs.filter((j) => j.status === "PENDING");
    }
    if (status === "active") {
      return jobs.filter((j) => j.status === "ACCEPTED" || j.status === "IN_PROGRESS");
    }
    if (status === "completed") {
      return jobs.filter((j) => j.status === "COMPLETED");
    }
    return jobs;
  };

  const renderJobCard = (job: Job) => (
    <Card key={job.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{job.booking.restaurant.name}</CardTitle>
          <Badge variant={statusColors[job.status]}>{job.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{job.booking.restaurant.address}, {job.booking.restaurant.city}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {job.booking.scheduledDate
                ? formatDate(job.booking.scheduledDate)
                : formatDate(job.booking.preferredDate)}{" "}
              (Scheduled)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {job.booking.scheduledTimeSlot || job.booking.preferredTimeSlot}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{job.booking.owner.name} - {job.booking.owner.phone}</span>
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="text-sm font-medium mb-2">Items:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {job.booking.items.map((item) => (
              <li key={item.id}>
                • {item.serviceItem?.name || item.partItem?.name} x{item.quantity}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 pt-2">
          {job.status === "PENDING" && (
            <>
              <Button className="flex-1" onClick={() => handleAccept(job.id)}>
                Accept
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => openRejectDialog(job.id)}>
                Reject
              </Button>
            </>
          )}
          {(job.status === "ACCEPTED" || job.status === "IN_PROGRESS") && (
            <Button
              className="flex-1"
              onClick={() => router.push("/engineer/jobs/" + job.id)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
          )}
          {job.status === "COMPLETED" && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/engineer/jobs/" + job.id)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Jobs</h1>
        <p className="text-muted-foreground">Manage your assigned service jobs</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({filterJobs("pending").length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({filterJobs("active").length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({filterJobs("completed").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {filterJobs("pending").length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending jobs
              </CardContent>
            </Card>
          ) : (
            filterJobs("pending").map(renderJobCard)
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          {filterJobs("active").length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active jobs
              </CardContent>
            </Card>
          ) : (
            filterJobs("active").map(renderJobCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {filterJobs("completed").length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No completed jobs
              </CardContent>
            </Card>
          ) : (
            filterJobs("completed").map(renderJobCard)
          )}
        </TabsContent>
      </Tabs>

      {/* Job Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Job Assignment</DialogTitle>
            <DialogDescription>
              Please provide a detailed reason for rejecting this job assignment. This will be sent to the admin.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RejectionReasonInput
              value={rejectionReason}
              onChange={(value) => {
                setRejectionReason(value);
                setRejectionError("");
              }}
              category="ENGINEER_ASSIGNMENT"
              error={rejectionError}
              required
              showTemplates
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setSelectedJobId(null);
                setRejectionReason("");
                setRejectionError("");
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || rejectionReason.trim().length < 10}
            >
              {isRejecting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
