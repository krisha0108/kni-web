"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Loader2, Calendar, Wrench, AlertTriangle, RefreshCw } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";

const visitStatusColors: Record<string, "default" | "success" | "warning" | "destructive"> = {
  SCHEDULED: "warning", ASSIGNED: "default", IN_PROGRESS: "default", COMPLETED: "success", MISSED: "destructive", CANCELLED: "destructive",
};

export default function OwnerContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contract, setContract] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownForm, setBreakdownForm] = useState({ equipmentName: "", problemDesc: "", urgency: "MEDIUM" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchContract = () => {
    fetch(`/api/owner/amc-contracts/${id}`)
      .then((r) => r.json())
      .then((d) => d.ok && setContract(d.data))
      .catch(() => toast({ title: "Error", description: "Failed to load", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchContract(); }, [id]);

  const handleBreakdown = async () => {
    if (!breakdownForm.equipmentName || !breakdownForm.problemDesc) {
      toast({ title: "Error", description: "Fill all fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owner/amc-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: id, ...breakdownForm }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: data.data.isCoveredByAMC ? "Breakdown reported - covered by AMC!" : "Breakdown reported - this will be chargeable (free visits exhausted)" });
        setShowBreakdown(false);
        setBreakdownForm({ equipmentName: "", problemDesc: "", urgency: "MEDIUM" });
        fetchContract();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenew = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/owner/amc-contracts/${id}/renew`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Renewal Request Submitted!", description: "Admin will schedule a re-survey. You can track progress in AMC Requests." });
        router.push(`/owner/amc-requests/${data.data.id}`);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to renew", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!contract) return <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Contract not found</p></CardContent></Card>;

  const completedVisits = contract.scheduledVisits.filter((v: any) => v.status === "COMPLETED").length;
  const totalVisits = contract.scheduledVisits.filter((v: any) => v.visitType === "PREVENTIVE").length;
  const daysLeft = Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/owner/amc-contracts")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" />{contract.contractNumber}</h1>
          <p className="text-muted-foreground text-sm">{contract.restaurant.name}</p>
        </div>
        <Badge variant={contract.status === "ACTIVE" ? "success" : "destructive"}>{contract.status}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{completedVisits}/{totalVisits}</p><p className="text-sm text-muted-foreground">Visits Done</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{contract.breakdownVisitsUsed}/{contract.freeBreakdownVisits}</p><p className="text-sm text-muted-foreground">Breakdowns Used</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{formatPrice(contract.amountPerCycle)}</p><p className="text-sm text-muted-foreground">/{contract.billingCycle.toLowerCase()}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className={`text-2xl font-bold ${daysLeft < 30 ? "text-red-600" : "text-green-600"}`}>{daysLeft > 0 ? daysLeft : 0}</p><p className="text-sm text-muted-foreground">Days Left</p></CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {contract.status === "ACTIVE" && (
          <Button onClick={() => setShowBreakdown(true)}><AlertTriangle className="mr-2 h-4 w-4" /> Report Breakdown</Button>
        )}
        {(contract.status === "ACTIVE" || contract.status === "EXPIRED") && (
          <Button variant="outline" onClick={handleRenew} disabled={isSubmitting}><RefreshCw className="mr-2 h-4 w-4" /> Renew Contract</Button>
        )}
      </div>

      {/* Contract Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Contract Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-muted-foreground">Start:</span> {formatDate(contract.startDate)}</div>
            <div><span className="text-muted-foreground">End:</span> {formatDate(contract.endDate)}</div>
            <div><span className="text-muted-foreground">Response SLA:</span> {contract.proposal?.responseTimeSLA || "N/A"}</div>
            <div><span className="text-muted-foreground">Resolution SLA:</span> {contract.proposal?.resolutionTimeSLA || "N/A"}</div>
          </div>
          {contract.proposal?.sparePartsPolicy && (
            <div><span className="text-muted-foreground">Spare Parts:</span> {contract.proposal.sparePartsPolicy}</div>
          )}
        </CardContent>
      </Card>

      {/* Visit Schedule */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Visit Schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {contract.scheduledVisits.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <span className="font-medium">{v.visitType === "BREAKDOWN" ? "Breakdown" : `Visit #${v.visitNumber}`}</span>
                  <span className="text-sm text-muted-foreground ml-2">{formatDate(v.scheduledDate)}</span>
                  {v.engineer && <span className="text-sm text-muted-foreground ml-2">- {v.engineer.name}</span>}
                </div>
                <Badge variant={visitStatusColors[v.status] || "default"}>{v.status}</Badge>
              </div>
            ))}
            {contract.scheduledVisits.length === 0 && <p className="text-muted-foreground">No visits scheduled</p>}
          </div>
        </CardContent>
      </Card>

      {/* Breakdowns */}
      {contract.breakdownRequests.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Breakdown History</CardTitle></CardHeader>
          <CardContent>
            {contract.breakdownRequests.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between border-b pb-2 last:border-0 mb-2">
                <div>
                  <p className="font-medium">{b.equipmentName}</p>
                  <p className="text-sm text-muted-foreground">{b.problemDesc}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{b.urgency}</Badge>
                    {b.isCoveredByAMC ? <Badge className="bg-green-100 text-green-800">Covered</Badge> : <Badge className="bg-red-100 text-red-800">Chargeable</Badge>}
                  </div>
                </div>
                <Badge variant={b.status === "RESOLVED" ? "success" : "warning"}>{b.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Breakdown Dialog */}
      <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report Breakdown</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Free breakdowns: {contract.breakdownVisitsUsed}/{contract.freeBreakdownVisits} used.
              {contract.breakdownVisitsUsed >= contract.freeBreakdownVisits && " This will be chargeable."}
            </p>
            <div><Label>Equipment Name *</Label><Input value={breakdownForm.equipmentName} onChange={(e) => setBreakdownForm({ ...breakdownForm, equipmentName: e.target.value })} placeholder="e.g., Commercial Burner" /></div>
            <div><Label>Problem Description *</Label><Textarea value={breakdownForm.problemDesc} onChange={(e) => setBreakdownForm({ ...breakdownForm, problemDesc: e.target.value })} placeholder="Describe the issue..." rows={3} /></div>
            <div><Label>Urgency</Label>
              <Select value={breakdownForm.urgency} onValueChange={(v) => setBreakdownForm({ ...breakdownForm, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High - Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleBreakdown} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
              Submit Breakdown
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
