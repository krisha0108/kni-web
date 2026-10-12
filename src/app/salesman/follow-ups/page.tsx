"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarClock, Check, Building2, Briefcase } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { FollowUpDialog, type FollowUpTarget } from "@/components/salesman/follow-up-dialog";

interface FollowUpRow {
  id: string;
  followUpDate: string;
  note: string;
  isDone: boolean;
  inquiry: { id: string; name: string; businessName: string | null } | null;
  company: { id: string; name: string } | null;
}

export default function SalesmanFollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUpTarget | null>(null);
  const { toast } = useToast();

  const fetchFollowUps = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/salesman/follow-ups");
      const data = await res.json();
      if (data.ok) setFollowUps(data.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const markDone = async (id: string) => {
    try {
      const res = await fetch(`/api/salesman/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: true }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Marked done" });
        fetchFollowUps();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update follow-up", variant: "destructive" });
    }
  };

  const openReschedule = (row: FollowUpRow) => {
    setReschedulingId(row.id);
    setRescheduleTarget({
      inquiryId: row.inquiry?.id,
      companyId: row.company?.id,
      targetName: row.company?.name || row.inquiry?.businessName || row.inquiry?.name || "this contact",
    });
  };

  // Rescheduling creates a fresh follow-up and marks the old one done,
  // matching the "stack multiple follow-ups over time" design rather than
  // editing history in place.
  const handleRescheduled = async () => {
    if (reschedulingId) {
      await fetch(`/api/salesman/follow-ups/${reschedulingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: true }),
      });
    }
    setReschedulingId(null);
    fetchFollowUps();
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const now = new Date();
  const pending = followUps.filter((f) => !f.isDone);
  const overdue = pending.filter((f) => new Date(f.followUpDate) < now);
  const upcoming = pending.filter((f) => new Date(f.followUpDate) >= now);

  const renderRow = (row: FollowUpRow, variant: "overdue" | "upcoming") => {
    const targetName = row.company?.name || row.inquiry?.businessName || row.inquiry?.name || "Unknown";
    return (
      <div key={row.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {row.company ? <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <p className="font-medium text-sm truncate">{targetName}</p>
            <Badge variant={variant === "overdue" ? "destructive" : "secondary"} className="text-xs shrink-0">
              {formatDateTime(row.followUpDate)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{row.note}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => openReschedule(row)}>
            Reschedule
          </Button>
          <Button size="sm" onClick={() => markDone(row.id)}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Follow-ups</h1>
        <p className="text-muted-foreground">Reminders you&apos;ve set on inquiries and companies</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-destructive" /> Overdue ({overdue.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing overdue</p>
          ) : (
            <div className="space-y-3">{overdue.map((row) => renderRow(row, "overdue"))}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" /> Upcoming ({upcoming.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming follow-ups</p>
          ) : (
            <div className="space-y-3">{upcoming.map((row) => renderRow(row, "upcoming"))}</div>
          )}
        </CardContent>
      </Card>

      <FollowUpDialog
        target={rescheduleTarget}
        onOpenChange={(open) => { if (!open) { setRescheduleTarget(null); setReschedulingId(null); } }}
        onSaved={handleRescheduled}
      />
    </div>
  );
}
