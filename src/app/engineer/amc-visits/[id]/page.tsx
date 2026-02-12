"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Wrench, Loader2, Plus, Trash2, Send, MapPin, Calendar, Phone, Camera } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface MaintenanceItem {
  equipmentName: string;
  workDone: string;
  condition: string;
  partsReplaced: string;
  notes: string;
}

export default function EngineerVisitFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [visit, setVisit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([
    { equipmentName: "", workDone: "", condition: "GOOD", partsReplaced: "", notes: "" },
  ]);
  const [overallNotes, setOverallNotes] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([""]);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/engineer/amc-visits")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const v = d.data.find((v: any) => v.id === id);
          if (v) setVisit(v);
        }
      })
      .catch(() => toast({ title: "Error", description: "Failed to load", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, [id]);

  const addItem = () => {
    setMaintenanceItems([...maintenanceItems, { equipmentName: "", workDone: "", condition: "GOOD", partsReplaced: "", notes: "" }]);
  };

  const removeItem = (index: number) => {
    if (maintenanceItems.length > 1) {
      setMaintenanceItems(maintenanceItems.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof MaintenanceItem, value: string) => {
    const updated = [...maintenanceItems];
    updated[index] = { ...updated[index], [field]: value };
    setMaintenanceItems(updated);
  };

  const handleSubmit = async () => {
    const filledItems = maintenanceItems.filter((item) => item.equipmentName.trim() && item.workDone.trim());
    if (filledItems.length === 0) {
      toast({ title: "Error", description: "Add at least one maintenance item with equipment name and work done", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/engineer/amc-visits/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workNotes: overallNotes || null,
          checklistJson: filledItems,
          photoUrls: photoUrls.filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Visit completed successfully!" });
        router.push("/engineer/amc-tasks");
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to complete visit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!visit) {
    return (
      <Card><CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Visit not found</p>
        <Button className="mt-4" onClick={() => router.push("/engineer/amc-tasks")}>Go Back</Button>
      </CardContent></Card>
    );
  }

  if (visit.status === "ASSIGNED") {
    return (
      <Card><CardContent className="py-12 text-center">
        <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium">Visit Not Accepted Yet</p>
        <p className="text-muted-foreground mt-1">You need to accept this visit before you can start filling the form.</p>
        <Button className="mt-4" onClick={() => router.push("/engineer/amc-tasks")}>Go to Tasks</Button>
      </CardContent></Card>
    );
  }

  const isCompleted = visit.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/engineer/amc-tasks")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Visit #{visit.visitNumber}
          </h1>
          <p className="text-muted-foreground text-sm">{visit.contract.restaurant.name}</p>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{visit.contract.restaurant.address}, {visit.contract.restaurant.city}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{visit.contract.owner.name} - {visit.contract.owner.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Scheduled: {formatDate(visit.scheduledDate)}</span>
          </div>
          {visit.contract.contractNumber && (
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Contract: {visit.contract.contractNumber}</Badge>
              <Badge>{visit.visitType || "PREVENTIVE"}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Maintenance Checklist</span>
            {!isCompleted && (
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" /> Add Equipment
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {maintenanceItems.map((item, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Equipment #{i + 1}</span>
                {!isCompleted && maintenanceItems.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeItem(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Equipment Name *</Label>
                  <Input value={item.equipmentName} onChange={(e) => updateItem(i, "equipmentName", e.target.value)} placeholder="e.g., Commercial Burner" disabled={isCompleted} />
                </div>
                <div>
                  <Label className="text-xs">Condition After Service</Label>
                  <Select value={item.condition} onValueChange={(v) => updateItem(i, "condition", v)} disabled={isCompleted}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOD">Good</SelectItem>
                      <SelectItem value="AVERAGE">Average</SelectItem>
                      <SelectItem value="POOR">Poor - Needs Attention</SelectItem>
                      <SelectItem value="CRITICAL">Critical - Urgent Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Work Done *</Label>
                <Textarea value={item.workDone} onChange={(e) => updateItem(i, "workDone", e.target.value)} placeholder="e.g., Cleaned burner, replaced gas nozzle, checked flame..." rows={2} disabled={isCompleted} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Parts Replaced (if any)</Label>
                  <Input value={item.partsReplaced} onChange={(e) => updateItem(i, "partsReplaced", e.target.value)} placeholder="e.g., Gas nozzle, igniter" disabled={isCompleted} />
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Input value={item.notes} onChange={(e) => updateItem(i, "notes", e.target.value)} placeholder="Any remarks..." disabled={isCompleted} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Overall Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Summary / Recommendations</Label>
            <Textarea value={overallNotes} onChange={(e) => setOverallNotes(e.target.value)} placeholder="Overall observations, recommendations for next visit, any issues that need follow-up..." rows={4} disabled={isCompleted} />
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      {!isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Camera className="h-4 w-4" /> Photos (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {photoUrls.map((url, i) => (
              <div key={i}>
                <ImageUpload
                  value={url}
                  onChange={(val) => {
                    const updated = [...photoUrls];
                    updated[i] = val;
                    setPhotoUrls(updated);
                  }}
                  label={`Photo ${i + 1}`}
                />
              </div>
            ))}
            {photoUrls.length < 5 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setPhotoUrls([...photoUrls, ""])}>
                <Plus className="mr-1 h-3 w-3" /> Add Photo
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {!isCompleted && (
        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Submit Visit Report</>
            )}
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push("/engineer/amc-tasks")}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
