"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Phone,
  CheckCircle,
  Loader2,
  Cpu,
  History,
  AlertTriangle,
  Play,
  Pause,
  Square,
  Timer,
  Package,
  Camera,
  Plus,
  X,
  Wrench,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";

interface ServiceHistory {
  id: string;
  createdAt: string;
  engineerAssignments: {
    workLog?: {
      completionNote: string;
      createdAt: string;
    };
  }[];
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  installLocation: string | null;
  purchaseDate: string;
  warrantyEndDate: string | null;
  notes: string | null;
  equipmentType?: {
    id: string;
    name: string;
    category: { id: string; name: string };
  };
  serviceBookings: ServiceHistory[];
}

interface PartUsed {
  id: string;
  name: string;
  price?: number;
}

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
    problemDescription?: string;
    notes?: string;
    restaurant: { id: string; name: string; address: string; city: string };
    owner: { id: string; name: string; phone: string };
    equipment?: Equipment;
    items: Array<{
      id: string;
      quantity: number;
      serviceItem?: { id: string; name: string };
      partItem?: { id: string; name: string; price?: number };
    }>;
  };
  workLog?: {
    id: string;
    startedAt?: string;
    completedAt?: string;
    workNotes?: string;
    proofImageUrls?: string[];
    timeSpentSeconds?: number;
    partsUsed?: string[];
  };
}

// Format seconds to HH:MM:SS
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function EngineerJobDetailPage() {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isPartsOpen, setIsPartsOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isStartingWork, setIsStartingWork] = useState(false);
  const [workNotes, setWorkNotes] = useState("");
  const [proofImageUrls, setProofImageUrls] = useState<string[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const MAX_IMAGES = 5;

  // Timer state
  const [timeSpent, setTimeSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Parts state - now stores objects with id and name
  const [usedParts, setUsedParts] = useState<PartUsed[]>([]);
  const [customPart, setCustomPart] = useState("");

  // Available parts from booking items (with IDs for proper API calls)
  const availableParts: PartUsed[] = job?.booking.items
    .filter((item) => item.partItem)
    .map((item) => ({
      id: item.partItem!.id,
      name: item.partItem!.name,
      price: item.partItem!.price || 0,
    })) || [];

  const fetchJob = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/engineer/jobs/" + jobId);
      const data = await response.json();
      if (data.ok) {
        setJob(data.data);
        // Restore timer and parts from work log if exists
        if (data.data.workLog) {
          if (data.data.workLog.timeSpentSeconds) {
            setTimeSpent(data.data.workLog.timeSpentSeconds);
          }
          // partsUsed from backend is array of part names/IDs
          // We convert them back to PartUsed objects if possible
          if (data.data.workLog.partsUsed && Array.isArray(data.data.workLog.partsUsed)) {
            const restoredParts: PartUsed[] = data.data.workLog.partsUsed.map((p: string) => ({
              id: p,
              name: p, // If it's a name, use it; if it's an ID, we'll display the ID
              price: 0,
            }));
            setUsedParts(restoredParts);
          }
        }
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

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  // Start work / Start timer
  const handleStartWork = async () => {
    setIsStartingWork(true);
    try {
      const response = await fetch("/api/engineer/jobs/" + jobId + "/start", {
        method: "POST",
      });
      const data = await response.json();

      if (data.ok) {
        setIsTimerRunning(true);
        toast({ title: "Work Started", description: "Timer is now running. Good luck!" });
        fetchJob();
      } else {
        // Still start timer locally even if API fails
        setIsTimerRunning(true);
        toast({ title: "Timer Started", description: "Timer started locally" });
      }
    } catch {
      // Start timer locally on error
      setIsTimerRunning(true);
      toast({ title: "Timer Started", description: "Timer started locally" });
    } finally {
      setIsStartingWork(false);
    }
  };

  // Toggle timer
  const handleToggleTimer = () => {
    setIsTimerRunning((prev) => !prev);
    if (!isTimerRunning) {
      toast({ title: "Timer Resumed", description: "Timer is running" });
    } else {
      toast({ title: "Timer Paused", description: `Time logged: ${formatTime(timeSpent)}` });
    }
  };

  // Add part (from available parts list)
  const handleAddPart = (part: PartUsed) => {
    if (!usedParts.find((p) => p.id === part.id)) {
      setUsedParts((prev) => [...prev, part]);
    }
  };

  // Remove part
  const handleRemovePart = (partId: string) => {
    setUsedParts((prev) => prev.filter((p) => p.id !== partId));
  };

  // Add custom part (no ID - will be stored as name only)
  const handleAddCustomPart = () => {
    const trimmed = customPart.trim();
    if (trimmed && !usedParts.find((p) => p.name === trimmed)) {
      setUsedParts((prev) => [...prev, { id: `custom-${Date.now()}`, name: trimmed, price: 0 }]);
      setCustomPart("");
    }
  };

  // Complete job
  const handleComplete = async () => {
    if (proofImageUrls.length === 0) {
      toast({ title: "Error", description: "Please upload at least one proof image", variant: "destructive" });
      return;
    }

    if (timeSpent === 0) {
      toast({ title: "Error", description: "Please track your work time before completing", variant: "destructive" });
      return;
    }

    // Stop timer
    setIsTimerRunning(false);

    setIsCompleting(true);
    try {
      // Build completion note with time and parts info
      const partNames = usedParts.map((p) => p.name).join(", ");
      const completionNote = `${workNotes}\n\nTime Spent: ${formatTime(timeSpent)}${usedParts.length > 0 ? `\nParts Used: ${partNames}` : ""}`;

      // Filter to only include parts with valid UUIDs (not custom parts)
      const validParts = usedParts
        .filter((part) => !part.id.startsWith("custom-"))
        .map((part) => ({
          partItemId: part.id,
          qty: 1,
          priceSnapshot: part.price || 0,
        }));

      const response = await fetch("/api/engineer/jobs/" + jobId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          completionNote: completionNote.trim(),
          proofImageUrls,
          partsUsed: validParts,
          timeSpentSeconds: timeSpent,
          workNotes: workNotes,
        }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Job completed successfully!" });
        setIsCompleteOpen(false);
        setWorkNotes("");
        setProofImageUrls([]);
        setUsedParts([]);
        setTimeSpent(0);
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  // Job status checks - use job.status as source of truth
  const isPending = job.status === "PENDING";
  const isAccepted = job.status === "ACCEPTED" || job.status === "IN_PROGRESS";
  const isCompleted = job.status === "COMPLETED";
  // Allow completion for any accepted/in-progress job that isn't marked COMPLETED
  const canComplete = isAccepted && !isCompleted;
  const workStarted = timeSpent > 0 || isTimerRunning;

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
          variant={isCompleted ? "success" : isAccepted ? "default" : "warning"}
          className="text-sm py-1 px-3"
        >
          {job.status}
        </Badge>
      </div>

      {/* Quick Tools - Only visible when job is accepted and work can be done */}
      {canComplete && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Work Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Timer Tool */}
              <div className="flex flex-col items-center p-4 bg-background rounded-lg border">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                    isTimerRunning
                      ? "bg-red-100 text-red-600"
                      : timeSpent > 0
                      ? "bg-green-100 text-green-600"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  <Timer className="h-8 w-8" />
                </div>
                <p className="font-mono text-2xl font-bold mb-2">{formatTime(timeSpent)}</p>
                {!workStarted ? (
                  <Button
                    onClick={handleStartWork}
                    disabled={isStartingWork}
                    className="w-full"
                  >
                    {isStartingWork ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Start Work
                  </Button>
                ) : (
                  <Button
                    onClick={handleToggleTimer}
                    variant={isTimerRunning ? "destructive" : "default"}
                    className="w-full"
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause Timer
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Resume Timer
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Parts Tool */}
              <div className="flex flex-col items-center p-4 bg-background rounded-lg border">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                    usedParts.length > 0
                      ? "bg-green-100 text-green-600"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  <Package className="h-8 w-8" />
                </div>
                <p className="text-lg font-medium mb-1">Parts Used</p>
                <p className={`text-2xl font-bold mb-2 ${usedParts.length > 0 ? "text-green-600" : "text-yellow-600"}`}>
                  {usedParts.length}
                </p>
                <Button onClick={() => setIsPartsOpen(true)} variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  {usedParts.length > 0 ? "Edit Parts" : "Add Parts"}
                </Button>
              </div>

              {/* Photos Tool */}
              <div className="flex flex-col items-center p-4 bg-background rounded-lg border">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                    proofImageUrls.length > 0
                      ? "bg-green-100 text-green-600"
                      : "bg-orange-100 text-orange-600"
                  }`}
                >
                  <Camera className="h-8 w-8" />
                </div>
                <p className="text-lg font-medium mb-1">Work Photos</p>
                <p className={`text-2xl font-bold mb-2 ${proofImageUrls.length > 0 ? "text-green-600" : "text-orange-600"}`}>
                  {proofImageUrls.length}/{MAX_IMAGES}
                </p>
                <Button onClick={() => setIsCompleteOpen(true)} variant="outline" className="w-full">
                  <Camera className="mr-2 h-4 w-4" />
                  Add Photos
                </Button>
              </div>
            </div>

            {/* Complete Button */}
            {workStarted && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setIsCompleteOpen(true)}
                  disabled={timeSpent === 0}
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Complete Job
                </Button>
                {timeSpent === 0 && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Start the timer to track your work time
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Job Info Cards */}
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
            <a
              href={`tel:${job.booking.owner.phone}`}
              className="text-primary hover:underline flex items-center gap-1"
            >
              <Phone className="h-4 w-4" />
              {job.booking.owner.phone}
            </a>
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

      {/* Equipment Information */}
      {job.booking.equipment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Equipment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Equipment</p>
                <p className="font-medium">{job.booking.equipment.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">
                  {job.booking.equipment.equipmentType?.name || job.booking.equipment.category}
                </p>
              </div>
              {job.booking.equipment.brand && (
                <div>
                  <p className="text-sm text-muted-foreground">Brand</p>
                  <p className="font-medium">{job.booking.equipment.brand}</p>
                </div>
              )}
              {job.booking.equipment.model && (
                <div>
                  <p className="text-sm text-muted-foreground">Model</p>
                  <p className="font-medium">{job.booking.equipment.model}</p>
                </div>
              )}
              {job.booking.equipment.serialNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Serial No.</p>
                  <p className="font-medium font-mono text-sm">{job.booking.equipment.serialNumber}</p>
                </div>
              )}
              {job.booking.equipment.installLocation && (
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{job.booking.equipment.installLocation}</p>
                </div>
              )}
            </div>

            {job.booking.equipment.notes && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Equipment Notes</p>
                    <p className="text-sm text-yellow-700">{job.booking.equipment.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Previous Service History */}
            {job.booking.equipment.serviceBookings && job.booking.equipment.serviceBookings.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Service History
                </p>
                <div className="space-y-2">
                  {job.booking.equipment.serviceBookings.map((service, index) => {
                    const workLog = service.engineerAssignments[0]?.workLog;
                    return (
                      <div key={service.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">
                            Service #{job.booking.equipment!.serviceBookings.length - index}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(workLog?.createdAt || service.createdAt)}
                          </span>
                        </div>
                        {workLog && (
                          <p className="text-muted-foreground line-clamp-2">
                            {workLog.completionNote}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Problem Description */}
      {job.booking.problemDescription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Problem Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{job.booking.problemDescription}</p>
          </CardContent>
        </Card>
      )}

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

      {/* Work Log - Show only when job status is COMPLETED */}
      {isCompleted && job.workLog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Work Log
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              {job.workLog.timeSpentSeconds && (
                <div>
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                  <p className="font-medium font-mono">{formatTime(job.workLog.timeSpentSeconds)}</p>
                </div>
              )}
            </div>

            {job.workLog.partsUsed && job.workLog.partsUsed.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Parts Used</p>
                <div className="flex flex-wrap gap-2">
                  {job.workLog.partsUsed.map((part, i) => (
                    <Badge key={i} variant="secondary">
                      {part}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {job.workLog.workNotes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{job.workLog.workNotes}</p>
              </div>
            )}

            {job.workLog.proofImageUrls && Array.isArray(job.workLog.proofImageUrls) && job.workLog.proofImageUrls.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Completion Proof ({job.workLog.proofImageUrls.filter(url => url && url.trim()).length} image{job.workLog.proofImageUrls.filter(url => url && url.trim()).length > 1 ? "s" : ""})
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {job.workLog.proofImageUrls.filter(url => url && url.trim()).map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Work proof ${index + 1}`}
                        className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(url, "_blank")}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
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

      {/* Parts Selection Dialog */}
      <Dialog open={isPartsOpen} onOpenChange={setIsPartsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Parts Inventory
            </DialogTitle>
            <DialogDescription>
              Select parts used in this service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selected Parts Count */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Selected Parts</span>
              <Badge variant={usedParts.length > 0 ? "default" : "secondary"}>
                {usedParts.length}
              </Badge>
            </div>

            {/* Available Parts */}
            {availableParts.length > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground">Available Parts</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {availableParts.map((part) => {
                    const isSelected = usedParts.some((p) => p.id === part.id);
                    return (
                      <Button
                        key={part.id}
                        variant={isSelected ? "default" : "outline"}
                        className="justify-start"
                        onClick={() =>
                          isSelected
                            ? handleRemovePart(part.id)
                            : handleAddPart(part)
                        }
                      >
                        {isSelected ? (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        {part.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Parts */}
            {usedParts.length > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground">Selected Parts</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {usedParts.map((part) => (
                    <Badge key={part.id} variant="secondary" className="pl-2 pr-1 py-1">
                      {part.name}
                      <button
                        onClick={() => handleRemovePart(part.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Part */}
            <div>
              <Label className="text-sm text-muted-foreground">Add Custom Part</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={customPart}
                  onChange={(e) => setCustomPart(e.target.value)}
                  placeholder="Enter part name..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomPart();
                    }
                  }}
                />
                <Button onClick={handleAddCustomPart} disabled={!customPart.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsPartsOpen(false)}>
              Done ({usedParts.length} parts)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Job Dialog */}
      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Complete Job
            </DialogTitle>
            <DialogDescription>
              Review your work and upload proof of completion
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Work Summary */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-muted rounded-lg">
              <div className="text-center">
                <Timer className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <p className="font-mono font-bold">{formatTime(timeSpent)}</p>
                <p className="text-xs text-muted-foreground">Time</p>
              </div>
              <div className="text-center">
                <Package className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                <p className="font-bold">{usedParts.length}</p>
                <p className="text-xs text-muted-foreground">Parts</p>
              </div>
              <div className="text-center">
                <Camera className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                <p className="font-bold">{proofImageUrls.length}</p>
                <p className="text-xs text-muted-foreground">Photos</p>
              </div>
            </div>

            {/* Work Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Work Notes</Label>
              <Textarea
                id="notes"
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="Describe the work completed, issues found, recommendations..."
                rows={4}
              />
            </div>

            {/* Proof Images */}
            <div className="space-y-2">
              <Label>Proof Images * (Max {MAX_IMAGES})</Label>
              <p className="text-sm text-muted-foreground">
                Upload photos showing completed work
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

            {/* Parts Summary */}
            {usedParts.length > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground">Parts Used</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {usedParts.map((part) => (
                    <Badge key={part.id} variant="outline" className="text-xs">
                      {part.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCompleteOpen(false)} disabled={isCompleting}>
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isCompleting || proofImageUrls.length === 0 || timeSpent === 0}
              className="w-full sm:w-auto"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
