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
import { useRestaurant } from "@/contexts/restaurant-context";

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
  const { selectedRestaurant } = useRestaurant();

  const userRole = selectedRestaurant?.role;
  const canCreate = userRole === "OWNER" || userRole === "MANAGER";

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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex items-start gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/owner/amc-contracts")} className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2"><Shield className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" /><span className="truncate">{contract.contractNumber}</span></h1>
          <p className="text-muted-foreground text-xs sm:text-sm truncate">{contract.restaurant.name}</p>
        </div>
        <Badge variant={contract.status === "ACTIVE" ? "success" : "destructive"} className="shrink-0 text-xs">{contract.status}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card><CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center"><p className="text-lg sm:text-2xl font-bold leading-tight break-all">{completedVisits}/{totalVisits}</p><p className="text-xs sm:text-sm text-muted-foreground">Visits Done</p></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center"><p className="text-lg sm:text-2xl font-bold leading-tight break-all">{contract.breakdownVisitsUsed}/{contract.freeBreakdownVisits}</p><p className="text-xs sm:text-sm text-muted-foreground">Breakdowns Used</p></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center"><p className="text-lg sm:text-2xl font-bold leading-tight break-all">{formatPrice(contract.amountPerCycle)}</p><p className="text-xs sm:text-sm text-muted-foreground">/{contract.billingCycle.toLowerCase()}</p></CardContent></Card>
        <Card><CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center"><p className={`text-lg sm:text-2xl font-bold leading-tight ${daysLeft < 30 ? "text-red-600" : "text-green-600"}`}>{daysLeft > 0 ? daysLeft : 0}</p><p className="text-xs sm:text-sm text-muted-foreground">Days Left</p></CardContent></Card>
      </div>

      {/* Actions */}
      {canCreate && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {contract.status === "ACTIVE" && (
            <Button onClick={() => setShowBreakdown(true)} className="w-full sm:w-auto" size="sm"><AlertTriangle className="mr-2 h-4 w-4" /> Report Breakdown</Button>
          )}
          {(contract.status === "ACTIVE" || contract.status === "EXPIRED") && (
            <Button variant="outline" onClick={handleRenew} disabled={isSubmitting} className="w-full sm:w-auto" size="sm"><RefreshCw className="mr-2 h-4 w-4" /> Renew Contract</Button>
          )}
        </div>
      )}

      {/* Contract Details */}
      <Card>
        <CardHeader><CardTitle className="text-sm sm:text-base">Contract Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            <div><span className="text-muted-foreground">Start:</span> <span className="font-medium">{formatDate(contract.startDate)}</span></div>
            <div><span className="text-muted-foreground">End:</span> <span className="font-medium">{formatDate(contract.endDate)}</span></div>
            <div><span className="text-muted-foreground">Response SLA:</span> <span className="font-medium">{contract.proposal?.responseTimeSLA || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Resolution SLA:</span> <span className="font-medium">{contract.proposal?.resolutionTimeSLA || "N/A"}</span></div>
          </div>
          {contract.proposal?.sparePartsPolicy && (
            <div className="pt-2 border-t"><span className="text-muted-foreground">Spare Parts:</span> <span className="font-medium">{contract.proposal.sparePartsPolicy}</span></div>
          )}
        </CardContent>
      </Card>

      {/* Visit Schedule */}
      <Card>
        <CardHeader><CardTitle className="text-sm sm:text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Visit Schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {contract.scheduledVisits.map((v: any) => (
              <div key={v.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sm">{v.visitType === "BREAKDOWN" ? "Breakdown" : `Visit #${v.visitNumber}`}</span>
                  <div className="flex flex-wrap gap-x-2 text-xs sm:text-sm text-muted-foreground">
                    <span>{formatDate(v.scheduledDate)}</span>
                    {v.engineer && <span>• {v.engineer.name}</span>}
                  </div>
                </div>
                <Badge variant={visitStatusColors[v.status] || "default"} className="text-xs w-fit">{v.status}</Badge>
              </div>
            ))}
            {contract.scheduledVisits.length === 0 && <p className="text-xs sm:text-sm text-muted-foreground">No visits scheduled</p>}
          </div>
        </CardContent>
      </Card>

      {/* Breakdowns */}
      {contract.breakdownRequests.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm sm:text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Breakdown History</CardTitle></CardHeader>
          <CardContent>
            {contract.breakdownRequests.map((b: any) => (
              <div key={b.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b pb-2 last:border-0 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{b.equipmentName}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{b.problemDesc}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{b.urgency}</Badge>
                    {b.isCoveredByAMC ? <Badge className="bg-green-100 text-green-800 text-xs">Covered</Badge> : <Badge className="bg-red-100 text-red-800 text-xs">Chargeable</Badge>}
                  </div>
                </div>
                <Badge variant={b.status === "RESOLVED" ? "success" : "warning"} className="text-xs w-fit shrink-0">{b.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Breakdown Dialog */}
      <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
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