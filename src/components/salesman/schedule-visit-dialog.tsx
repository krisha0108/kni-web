"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin } from "lucide-react";

export interface ScheduleVisitTarget {
  inquiryId: string;
  companyName: string;
  contactPerson?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
}

interface ScheduleVisitDialogProps {
  target: ScheduleVisitTarget | null;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
}

// Compact "Schedule Visit" popup opened directly from an Inquiry row — the
// company/contact are already known, so this only asks for date, time and
// notes before posting to the existing /api/salesman/visits endpoint.
export function ScheduleVisitDialog({ target, onOpenChange, onScheduled }: ScheduleVisitDialogProps) {
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 16));
  const [purpose, setPurpose] = useState("");
  const [discussion, setDiscussion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (target) {
      setVisitDate(new Date().toISOString().slice(0, 16));
      setPurpose("");
      setDiscussion("");
    }
  }, [target]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/salesman/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: target.inquiryId,
          companyName: target.companyName,
          contactPerson: target.contactPerson || undefined,
          mobileNumber: target.mobileNumber || undefined,
          email: target.email || undefined,
          visitDate,
          purpose: purpose || undefined,
          discussion: discussion || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Visit Scheduled", description: `Visit with ${target.companyName} added` });
        onScheduled?.();
        onOpenChange(false);
      } else {
        toast({ title: "Error", description: data.error || "Failed to schedule visit", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to schedule visit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Visit</DialogTitle>
          <DialogDescription>
            {target ? `With ${target.companyName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visitDate">Visit Date/Time <span className="text-destructive">*</span></Label>
            <Input id="visitDate" type="datetime-local" required value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Visit</Label>
            <Input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discussion">Notes</Label>
            <Textarea id="discussion" rows={3} value={discussion} onChange={(e) => setDiscussion(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
              Schedule Visit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
