"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ArrowLeft, FileText, Loader2, Send, Plus, X } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";

export default function CreateProposalPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);
  const [request, setRequest] = useState<any>(null);
  const [survey, setSurvey] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    preventiveVisits: 12,
    freeBreakdownVisits: 3,
    responseTimeSLA: "4 hours",
    resolutionTimeSLA: "24 hours",
    sparePartsPolicies: [] as string[],
    price: "",
    contractPeriod: "1 YEAR",
    exclusions: [] as string[],
  });
  const [newSparePolicy, setNewSparePolicy] = useState("");
  const [newExclusion, setNewExclusion] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Fetch request details
    fetch(`/api/admin/amc-requests/${requestId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setRequest(d.data);
          if (d.data.survey) setSurvey(d.data.survey);
          // Pre-fill visits based on frequency
          const freq = d.data.visitFrequency;
          const visits = freq === "MONTHLY" ? 12 : freq === "BI_MONTHLY" ? 6 : 4;
          setFormData((prev) => ({ ...prev, preventiveVisits: visits }));
        }
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load AMC request details", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [requestId]);

  const handleSubmit = async (sendImmediately: boolean) => {
    if (!formData.price) {
      toast({ title: "Error", description: "Price is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create proposal
      const res = await fetch("/api/admin/amc-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          coveredEquipment: survey?.equipmentList || [],
          preventiveVisits: formData.preventiveVisits,
          freeBreakdownVisits: formData.freeBreakdownVisits,
          responseTimeSLA: formData.responseTimeSLA,
          resolutionTimeSLA: formData.resolutionTimeSLA,
          sparePartsPolicy: formData.sparePartsPolicies.length > 0 ? formData.sparePartsPolicies.join("\n") : null,
          price: Math.round(parseFloat(formData.price)),
          contractPeriod: formData.contractPeriod,
          exclusions: formData.exclusions,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        toast({ title: "Error", description: data.error || "Failed to create proposal", variant: "destructive" });
        return;
      }

      // If send immediately, also send the proposal
      if (sendImmediately) {
        const sendRes = await fetch(`/api/admin/amc-proposals/${data.data.id}/send`, { method: "POST" });
        const sendData = await sendRes.json();
        if (sendData.ok) {
          toast({ title: "Success", description: "Proposal created and sent to owner!" });
        } else {
          toast({ title: "Partial Success", description: "Proposal created but failed to send. You can send it later." });
        }
      } else {
        toast({ title: "Success", description: "Proposal created as draft!" });
      }

      router.push("/admin/amc-requests");
    } catch {
      toast({ title: "Error", description: "Failed to create proposal", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!request) {
    return (
      <Card><CardContent className="py-12 text-center">
        <p className="text-muted-foreground">AMC request not found</p>
        <Button className="mt-4" onClick={() => router.push("/admin/amc-requests")}>Go Back</Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create AMC Proposal
          </h1>
          <p className="text-muted-foreground text-sm">{request.restaurant.name} - {request.owner.name}</p>
        </div>
      </div>

      {/* Request Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Restaurant:</span><p className="font-medium">{request.restaurant.name}</p></div>
            <div><span className="text-muted-foreground">Plan:</span><p className="font-medium">{request.planType}</p></div>
            <div><span className="text-muted-foreground">Frequency:</span><p className="font-medium">{request.visitFrequency}</p></div>
            <div><span className="text-muted-foreground">Kitchen:</span><p className="font-medium">{request.kitchenType}</p></div>
          </div>
          <div className="mt-3">
            <span className="text-sm text-muted-foreground">Equipment Categories:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {Array.isArray(request.equipmentCategories) && request.equipmentCategories.map((cat: string) => (
                <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposal Form */}
      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
          <CardDescription>Define what the AMC contract will cover</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preventive Visits (per year) *</Label>
              <Input type="number" value={formData.preventiveVisits} onChange={(e) => setFormData({ ...formData, preventiveVisits: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Free Breakdown Visits (per year)</Label>
              <Input type="number" value={formData.freeBreakdownVisits} onChange={(e) => setFormData({ ...formData, freeBreakdownVisits: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Response Time SLA</Label>
              <Select value={formData.responseTimeSLA} onValueChange={(v) => setFormData({ ...formData, responseTimeSLA: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2 hours">2 Hours</SelectItem>
                  <SelectItem value="4 hours">4 Hours</SelectItem>
                  <SelectItem value="8 hours">8 Hours</SelectItem>
                  <SelectItem value="24 hours">24 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resolution Time SLA</Label>
              <Select value={formData.resolutionTimeSLA} onValueChange={(v) => setFormData({ ...formData, resolutionTimeSLA: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="8 hours">8 Hours</SelectItem>
                  <SelectItem value="24 hours">24 Hours</SelectItem>
                  <SelectItem value="48 hours">48 Hours</SelectItem>
                  <SelectItem value="72 hours">72 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Spare Parts Policy</Label>
            <div className="flex gap-2">
              <Input value={newSparePolicy} onChange={(e) => setNewSparePolicy(e.target.value)} placeholder="e.g., 10% discount on spare parts" onKeyDown={(e) => { if (e.key === "Enter" && newSparePolicy.trim()) { e.preventDefault(); setFormData({ ...formData, sparePartsPolicies: [...formData.sparePartsPolicies, newSparePolicy.trim()] }); setNewSparePolicy(""); } }} />
              <Button type="button" size="icon" variant="outline" onClick={() => { if (newSparePolicy.trim()) { setFormData({ ...formData, sparePartsPolicies: [...formData.sparePartsPolicies, newSparePolicy.trim()] }); setNewSparePolicy(""); } }}><Plus className="h-4 w-4" /></Button>
            </div>
            {formData.sparePartsPolicies.length > 0 && (
              <div className="space-y-1 mt-2">
                {formData.sparePartsPolicies.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 text-sm">
                    <span className="flex-1">{item}</span>
                    <button type="button" onClick={() => setFormData({ ...formData, sparePartsPolicies: formData.sparePartsPolicies.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Exclusions</Label>
            <div className="flex gap-2">
              <Input value={newExclusion} onChange={(e) => setNewExclusion(e.target.value)} placeholder="e.g., External damage" onKeyDown={(e) => { if (e.key === "Enter" && newExclusion.trim()) { e.preventDefault(); setFormData({ ...formData, exclusions: [...formData.exclusions, newExclusion.trim()] }); setNewExclusion(""); } }} />
              <Button type="button" size="icon" variant="outline" onClick={() => { if (newExclusion.trim()) { setFormData({ ...formData, exclusions: [...formData.exclusions, newExclusion.trim()] }); setNewExclusion(""); } }}><Plus className="h-4 w-4" /></Button>
            </div>
            {formData.exclusions.length > 0 && (
              <div className="space-y-1 mt-2">
                {formData.exclusions.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 text-sm">
                    <span className="flex-1">{item}</span>
                    <button type="button" onClick={() => setFormData({ ...formData, exclusions: formData.exclusions.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>Set the contract pricing (in INR)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Price (INR) *</Label>
              <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="e.g., 50000" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contract Period</Label>
            <Select value={formData.contractPeriod} onValueChange={(v) => setFormData({ ...formData, contractPeriod: v })}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1 YEAR">1 Year</SelectItem>
                <SelectItem value="2 YEAR">2 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => handleSubmit(true)} disabled={isSubmitting} size="lg">
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : <><Send className="mr-2 h-4 w-4" /> Create & Send to Owner</>}
        </Button>
        <Button variant="outline" onClick={() => handleSubmit(false)} disabled={isSubmitting} size="lg">
          Save as Draft
        </Button>
        <Button variant="ghost" onClick={() => router.back()} size="lg">Cancel</Button>
      </div>
    </div>
  );
}