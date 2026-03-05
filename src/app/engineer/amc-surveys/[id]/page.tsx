"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Loader2, Plus, Trash2, Send, MapPin, Calendar, Phone } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface EquipmentItem {
  name: string;
  brand: string;
  model: string;
  age: string;
  condition: string;
  spareRisk: string;
  notes: string;
}

export default function EngineerSurveyFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [survey, setSurvey] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([
    { name: "", brand: "", model: "", age: "", condition: "GOOD", spareRisk: "LOW", notes: "" },
  ]);
  const [overallCondition, setOverallCondition] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/engineer/amc-surveys`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const s = d.data.find((s: any) => s.id === id);
          if (s) {
            setSurvey(s);
            if (s.equipmentList && Array.isArray(s.equipmentList) && s.equipmentList.length > 0) {
              setEquipmentList(s.equipmentList);
            }
            if (s.overallCondition) setOverallCondition(s.overallCondition);
            if (s.specialNotes) setSpecialNotes(s.specialNotes);
          }
        }
      })
      .catch(() => toast({ title: "Error", description: "Failed to load", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, [id]);

  const addEquipment = () => {
    setEquipmentList([...equipmentList, { name: "", brand: "", model: "", age: "", condition: "GOOD", spareRisk: "LOW", notes: "" }]);
  };

  const removeEquipment = (index: number) => {
    if (equipmentList.length > 1) {
      setEquipmentList(equipmentList.filter((_, i) => i !== index));
    }
  };

  const updateEquipment = (index: number, field: keyof EquipmentItem, value: string) => {
    const updated = [...equipmentList];
    updated[index] = { ...updated[index], [field]: value };
    setEquipmentList(updated);
  };

  const handleSubmit = async () => {
    if (!overallCondition) {
      toast({ title: "Error", description: "Please select overall condition", variant: "destructive" });
      return;
    }

    const filledEquipment = equipmentList.filter((e) => e.name.trim());
    if (filledEquipment.length === 0) {
      toast({ title: "Error", description: "Add at least one equipment item", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/engineer/amc-surveys/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentList: filledEquipment,
          overallCondition,
          specialNotes: specialNotes || null,
          photoUrls: [],
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Survey submitted successfully!" });
        router.push("/engineer/amc-surveys");
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit survey", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!survey) {
    return (
      <Card><CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Survey not found</p>
        <Button className="mt-4" onClick={() => router.push("/engineer/amc-surveys")}>Go Back</Button>
      </CardContent></Card>
    );
  }

  if (survey.status === "SCHEDULED") {
    return (
      <Card><CardContent className="py-12 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium">Survey Not Accepted Yet</p>
        <p className="text-muted-foreground mt-1">You need to accept this survey before you can start filling the form.</p>
        <Button className="mt-4" onClick={() => router.push("/engineer/amc-surveys")}>Go to Surveys</Button>
      </CardContent></Card>
    );
  }

  const isCompleted = survey.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/engineer/amc-surveys")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Site Survey
          </h1>
          <p className="text-muted-foreground text-sm">{survey.request.restaurant.name}</p>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{survey.request.restaurant.address}, {survey.request.restaurant.city}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{survey.request.owner.name} - {survey.request.owner.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Scheduled: {formatDate(survey.scheduledDate)}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge>{survey.request.planType}</Badge>
            <Badge variant="outline">{survey.request.kitchenType}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Equipment List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Equipment Found</span>
            {!isCompleted && (
              <Button size="sm" variant="outline" onClick={addEquipment}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {equipmentList.map((eq, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Equipment #{i + 1}</span>
                {!isCompleted && equipmentList.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeEquipment(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={eq.name} onChange={(e) => updateEquipment(i, "name", e.target.value)} placeholder="e.g., Commercial Burner" disabled={isCompleted} />
                </div>
                <div>
                  <Label className="text-xs">Brand</Label>
                  <Input value={eq.brand} onChange={(e) => updateEquipment(i, "brand", e.target.value)} placeholder="Brand" disabled={isCompleted} />
                </div>
                <div>
                  <Label className="text-xs">Model</Label>
                  <Input value={eq.model} onChange={(e) => updateEquipment(i, "model", e.target.value)} placeholder="Model" disabled={isCompleted} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Age</Label>
                  <Input value={eq.age} onChange={(e) => updateEquipment(i, "age", e.target.value)} placeholder="e.g., 2 years" disabled={isCompleted} />
                </div>
                <div>
                  <Label className="text-xs">Condition</Label>
                  <Select value={eq.condition} onValueChange={(v) => updateEquipment(i, "condition", v)} disabled={isCompleted}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOD">Good</SelectItem>
                      <SelectItem value="AVERAGE">Average</SelectItem>
                      <SelectItem value="POOR">Poor</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Spare Risk</Label>
                  <Select value={eq.spareRisk} onValueChange={(v) => updateEquipment(i, "spareRisk", v)} disabled={isCompleted}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input value={eq.notes} onChange={(e) => updateEquipment(i, "notes", e.target.value)} placeholder="Any notes..." disabled={isCompleted} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Overall Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Overall Kitchen Condition *</Label>
            <Select value={overallCondition} onValueChange={setOverallCondition} disabled={isCompleted}>
              <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GOOD">Good - Minor maintenance needed</SelectItem>
                <SelectItem value="AVERAGE">Average - Regular maintenance required</SelectItem>
                <SelectItem value="CRITICAL">Critical - Urgent attention needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Special Notes / Recommendations</Label>
            <Textarea value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} placeholder="Any special observations or recommendations..." rows={4} disabled={isCompleted} />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      {!isCompleted && (
        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Submit Survey Report</>
            )}
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push("/engineer/amc-surveys")}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}