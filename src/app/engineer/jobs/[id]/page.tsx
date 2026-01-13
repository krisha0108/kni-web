"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Calendar, Clock, Phone, CheckCircle, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";

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
    notes?: string;
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
    workNotes?: string;
    proofImageUrls?: string[];
  };
}

export default function EngineerJobDetailPage() {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [workNotes, setWorkNotes] = useState("");
  const [proofImageUrls, setProofImageUrls] = useState<string[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const MAX_IMAGES = 5;

  const fetchJob = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/engineer/jobs/" + jobId);
      const data = await response.json();
      if (data.ok) {
        setJob(data.data);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        router.push("/engineer/jobs");
      }
    } catch {
      toast({ title: "Error", description: "Failed to load job", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const handleComplete = async () => {
    if (proofImageUrls.length === 0) {
      toast({ title: "Error", description: "Please upload at least one proof image", variant: "destructive" });
      return;
    }

    setIsCompleting(true);
    try {
      const response = await fetch("/api/engineer/jobs/" + jobId + "/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workNotes,
          proofImageUrls,
        }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Job completed successfully" });
        setIsCompleteOpen(false);
        setWorkNotes("");
        setProofImageUrls([]);
        fetchJob();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to complete job", variant: "destructive" });
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  // Engineers can complete the job directly after accepting it (and not already completed)
  const canComplete = job.status === "ACCEPTED" && !job.workLog;
  const isCompleted = job.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/engineer/jobs")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Jobs
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Details</h1>
          <p className="text-muted-foreground">{job.booking.restaurant.name}</p>
        </div>
        <Badge
          variant={
            job.status === "COMPLETED"
              ? "success"
              : "warning"
          }
          className="text-sm py-1 px-3"
        >
          {job.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{job.booking.restaurant.name}</p>
            <p className="text-muted-foreground">{job.booking.restaurant.address}</p>
            <p className="text-muted-foreground">{job.booking.restaurant.city}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{job.booking.owner.name}</p>
            <p className="text-muted-foreground">{job.booking.owner.phone}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatDate(job.booking.scheduledDate || job.booking.preferredDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{job.booking.scheduledTimeSlot || job.booking.preferredTimeSlot}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items to Service</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {job.booking.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>{item.serviceItem?.name || item.partItem?.name}</span>
                  <span className="text-muted-foreground">x{item.quantity}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {job.booking.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{job.booking.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Work Log */}
      {job.workLog && (
        <Card>
          <CardHeader>
            <CardTitle>Work Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.workLog.startedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">{formatDate(job.workLog.startedAt)}</p>
              </div>
            )}
            {job.workLog.completedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">{formatDate(job.workLog.completedAt)}</p>
              </div>
            )}
            {job.workLog.workNotes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p>{job.workLog.workNotes}</p>
              </div>
            )}
            {job.workLog.proofImageUrls && Array.isArray(job.workLog.proofImageUrls) && job.workLog.proofImageUrls.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Completion Proof ({job.workLog.proofImageUrls.filter(url => url && url.trim()).length} image{job.workLog.proofImageUrls.filter(url => url && url.trim()).length > 1 ? 's' : ''})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {job.workLog.proofImageUrls.filter(url => url && url.trim()).map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Work proof ${index + 1}`}
                        className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(url, "_blank")}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click images to view full size
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {canComplete && (
        <Card>
          <CardContent className="pt-6">
            <Button className="w-full" onClick={() => setIsCompleteOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Job
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Complete Dialog */}
      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
            <DialogDescription>
              Add notes and upload proof of completed work
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Work Notes</Label>
              <Textarea
                id="notes"
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="Describe the work completed..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Proof Images * (Max {MAX_IMAGES})</Label>
              <p className="text-sm text-muted-foreground">
                Select multiple files at once to upload up to {MAX_IMAGES} images
              </p>
              <MultipleImageUpload
                value={proofImageUrls}
                onChange={setProofImageUrls}
                folder="work-completion-proofs"
                maxImages={MAX_IMAGES}
                maxSizeMB={5}
                disabled={isCompleting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteOpen(false)} disabled={isCompleting}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={isCompleting || proofImageUrls.length === 0}>
              {isCompleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                "Complete Job"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
