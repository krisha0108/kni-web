"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface JobApplicationDialogProps {
  position: { id: string; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = { name: "", email: "", phone: "", message: "" };

export default function JobApplicationDialog({ position, open, onOpenChange }: JobApplicationDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setForm(emptyForm);
    setResumeFile(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!position) return;
    if (!form.name || !form.email || !form.phone) {
      toast({ title: "Missing details", description: "Name, email and phone are required", variant: "destructive" });
      return;
    }

    try {
      setIsSubmitting(true);
      const fd = new FormData();
      fd.set("jobPositionId", position.id);
      fd.set("name", form.name);
      fd.set("email", form.email);
      fd.set("phone", form.phone);
      if (form.message) fd.set("message", form.message);
      if (resumeFile) fd.set("resume", resumeFile);

      const response = await fetch("/api/public/job-applications", { method: "POST", body: fd });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Application submitted", description: "Thanks for applying — we'll be in touch." });
        reset();
        onOpenChange(false);
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit application", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit application", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for {position?.title}</DialogTitle>
          <DialogDescription>Fill in your details and we&apos;ll get back to you.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apply-name">Full Name *</Label>
            <Input
              id="apply-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apply-email">Email *</Label>
            <Input
              id="apply-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apply-phone">Phone *</Label>
            <Input
              id="apply-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Your phone number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apply-resume">Resume (PDF, JPEG, PNG or WebP, max 10MB)</Label>
            <Input
              id="apply-resume"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apply-message">Message</Label>
            <Textarea
              id="apply-message"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Anything you'd like us to know"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
