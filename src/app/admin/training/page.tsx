"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, Plus, Users } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Program {
  id: string;
  title: string;
  description: string | null;
  type: "TRAINING" | "SEMINAR";
  scheduledAt: string;
  seatLimit: number | null;
  _count: { attendances: number };
}

export default function AdminTrainingPage() {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"TRAINING" | "SEMINAR">("TRAINING");
  const [scheduledAt, setScheduledAt] = useState("");
  const [seatLimit, setSeatLimit] = useState("");

  const fetchPrograms = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/training-programs");
      const data = await res.json();
      if (data.ok) setPrograms(data.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const handleCreate = async () => {
    if (!title || !scheduledAt) {
      toast({ title: "Title and scheduled date/time are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/training-programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          type,
          scheduledAt: new Date(scheduledAt).toISOString(),
          seatLimit: seatLimit ? parseInt(seatLimit) : undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Program created" });
        setOpen(false);
        setTitle("");
        setDescription("");
        setScheduledAt("");
        setSeatLimit("");
        fetchPrograms();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl lg:text-3xl">
            <GraduationCap className="h-6 w-6" />
            Training & Seminars
          </h1>
          <p className="text-muted-foreground">Schedule technician training programs and seminars</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Program
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></CardContent></Card>
      ) : programs.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><GraduationCap className="mb-4 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">No training programs yet</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <Link key={p.id} href={`/admin/training/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <Badge variant={p.type === "SEMINAR" ? "secondary" : "default"}>{p.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>{formatDateTime(p.scheduledAt)}</p>
                  <p className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {p._count.attendances}{p.seatLimit ? ` / ${p.seatLimit}` : ""} enrolled
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>New Training Program / Seminar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "TRAINING" | "SEMINAR")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="SEMINAR">Seminar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Date & Time *</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div>
              <Label>Seat Limit (optional)</Label>
              <Input type="number" value={seatLimit} onChange={(e) => setSeatLimit(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={creating} onClick={handleCreate}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
