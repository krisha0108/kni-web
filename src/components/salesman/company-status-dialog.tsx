"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export type CompanyStatusValue = "IN_PROGRESS" | "NOT_PROGRESSING" | "SUCCESS";

export interface CompanyStatusTarget {
  companyId: string;
  companyName: string;
  currentStatus: CompanyStatusValue;
}

const STATUS_OPTIONS: { value: CompanyStatusValue; label: string; hint: string }[] = [
  { value: "IN_PROGRESS", label: "In Progress", hint: "Discussion is ongoing" },
  { value: "NOT_PROGRESSING", label: "Not Progressing", hint: "Discussion has stalled" },
  { value: "SUCCESS", label: "Success", hint: "Deal closed" },
];

interface CompanyStatusDialogProps {
  target: CompanyStatusTarget | null;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (status: CompanyStatusValue) => void;
}

export function CompanyStatusDialog({ target, onOpenChange, onUpdated }: CompanyStatusDialogProps) {
  const [status, setStatus] = useState<CompanyStatusValue>("IN_PROGRESS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (target) setStatus(target.currentStatus);
  }, [target]);

  const handleSave = async () => {
    if (!target) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/salesman/companies/${target.companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Status Updated", description: `${target.companyName} marked as ${status.replace(/_/g, " ").toLowerCase()}` });
        onUpdated?.(status);
        onOpenChange(false);
      } else {
        toast({ title: "Error", description: data.error || "Failed to update status", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>{target ? target.companyName : ""}</DialogDescription>
        </DialogHeader>

        <RadioGroup value={status} onValueChange={(v) => setStatus(v as CompanyStatusValue)} className="space-y-3">
          {STATUS_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-start gap-3 border rounded-lg p-3">
              <RadioGroupItem value={opt.value} id={`status-${opt.value}`} className="mt-0.5" />
              <Label htmlFor={`status-${opt.value}`} className="cursor-pointer font-normal">
                <span className="block font-medium text-sm">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.hint}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
