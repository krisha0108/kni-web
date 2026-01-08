"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Calendar, Clock, Phone, Play, CheckCircle, Image as ImageIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatDate } from "@/lib/utils";

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
    proofImageUrl?: string;
  };
}

export default function EngineerJobDetailPage() {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [workNotes, setWorkNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

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

  const handleStartWork = async () => {
    setIsStarting(true);
    try {
      const response = await fetch("/api/engineer/jobs/" + jobId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Work started" });
        fetchJob();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to start work", variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleComplete = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please upload proof image", variant: "destructive" });
      return;
    }

    setIsCompleting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("workNotes", workNotes);

      const response = await fetch("/api/engineer/jobs/" + jobId + "/complete", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Job completed successfully" });
        setIsCompleteOpen(false);
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

  const canStart = job.status === "ACCEPTED";
  const canComplete = job.status === "IN_PROGRESS";
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
              : job.status === "IN_PROGRESS"
              ? "default"
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
            {job.workLog.proofImageUrl && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Completion Proof</p>
                <img
                  src={job.workLog.proofImageUrl}
                  alt="Work proof"
                  className="max-h-48 rounded border"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!isCompleted && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              {canStart && (
                <Button className="flex-1" onClick={handleStartWork} disabled={isStarting}>
                  <Play className="mr-2 h-4 w-4" />
                  {isStarting ? "Starting..." : "Start Work"}
                </Button>
              )}
              {canComplete && (
                <Button className="flex-1" onClick={() => setIsCompleteOpen(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Job
                </Button>
              )}
            </div>
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
              <Label htmlFor="proof">Proof Image *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-32 mx-auto rounded"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload</p>
                    <Input
                      id="proof"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? "Completing..." : "Complete Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
