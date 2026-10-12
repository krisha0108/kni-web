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
import { Loader2, CalendarClock } from "lucide-react";

export interface FollowUpTarget {
  inquiryId?: string;
  companyId?: string;
  targetName: string;
}

interface FollowUpDialogProps {
  target: FollowUpTarget | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

function defaultFollowUpDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

// "Add Follow-up" popup opened from an Inquiry row or a Company row — sets a
// date/time + note, which the daily reminders cron (src/app/api/cron/reminders)
// turns into a push/in-app notification when it's due.
export function FollowUpDialog({ target, onOpenChange, onSaved }: FollowUpDialogProps) {
  const [followUpDate, setFollowUpDate] = useState(defaultFollowUpDate());
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (target) {
      setFollowUpDate(defaultFollowUpDate());
      setNote("");
    }
  }, [target]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/salesman/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: target.inquiryId,
          companyId: target.companyId,
          followUpDate,
          note,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Follow-up Set", description: `You'll be reminded about ${target.targetName}` });
        onSaved?.();
        onOpenChange(false);
      } else {
        toast({ title: "Error", description: data.error || "Failed to set follow-up", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to set follow-up", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Add Follow-up</DialogTitle>
          <DialogDescription>
            {target ? `For ${target.targetName} — you'll get a reminder when it's due.` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="followUpDate">Follow-up Date/Time <span className="text-destructive">*</span></Label>
            <Input id="followUpDate" type="datetime-local" required value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note <span className="text-destructive">*</span></Label>
            <Textarea id="note" required rows={3} placeholder="What to follow up about..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !note.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarClock className="h-4 w-4 mr-2" />}
              Set Follow-up
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
