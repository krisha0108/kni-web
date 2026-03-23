"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Calendar, UserCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

const visitStatusColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  SCHEDULED: "warning",
  ASSIGNED: "default",
  IN_PROGRESS: "secondary",
  COMPLETED: "success",
  MISSED: "destructive",
  RESCHEDULED: "warning",
  CANCELLED: "destructive",
};

export default function AdminAMCVisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [assignEngineerId, setAssignEngineerId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      params.set("page", page.toString());
      params.set("pageSize", "20");
      const [visitsRes, engRes] = await Promise.all([
        fetch(`/api/admin/amc-visits?${params}`),
        fetch("/api/admin/engineers"),
      ]);
      const [visitsData, engData] = await Promise.all([visitsRes.json(), engRes.json()]);
      if (visitsData.ok) {
        const items = visitsData.data?.items || visitsData.data;
        const total = visitsData.data?.total || visitsData.total || 0;
        const pSize = visitsData.data?.pageSize || 20;
        setVisits(Array.isArray(items) ? items : []);
        setTotalPages(visitsData.totalPages || Math.ceil(total / pSize) || 1);
      }
      if (engData.ok) setEngineers(engData.data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus, page]);

  const handleAssign = async () => {
    if (!selectedVisit || !assignEngineerId) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/admin/amc-visits/${selectedVisit.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engineerId: assignEngineerId }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Engineer assigned!" });
        setSelectedVisit(null);
        setAssignEngineerId("");
        fetchData();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to assign", variant: "destructive" });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6" /> AMC Visits</h1>
        <p className="text-muted-foreground">Manage all scheduled AMC visits</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="MISSED">Missed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{visits.length} visits</span>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></CardContent></Card>
      ) : visits.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No visits found</p></CardContent></Card>
      ) : (
        <div className="border rounded-lg">
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visit #</TableHead>
                <TableHead>Restaurant</TableHead>
                
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Engineer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {visits.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>#{v.visitNumber}<span className="block text-xs text-muted-foreground">{v.visitType}</span></TableCell>
                  <TableCell className="font-medium">{v.contract.restaurant.name}</TableCell>
                  
                  <TableCell className="hidden md:table-cell">{v.contract.owner.name}</TableCell>
                  <TableCell>{formatDate(v.scheduledDate)}</TableCell>
                  <TableCell className="hidden md:table-cell">{v.engineer?.name || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                  <TableCell><Badge variant={visitStatusColors[v.status]}>{v.status}</Badge></TableCell>
                  <TableCell>
                    {(v.status === "SCHEDULED" || !v.engineerId) && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedVisit(v); setAssignEngineerId(""); }}>
                        <UserCheck className="h-3 w-3 mr-1" /> Assign
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4 p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={!!selectedVisit} onOpenChange={(o) => !o && setSelectedVisit(null)}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assign Engineer to Visit</DialogTitle></DialogHeader>
          {selectedVisit && (
            <div className="space-y-4">
              <p className="text-sm">Visit #{selectedVisit.visitNumber} at {selectedVisit.contract?.restaurant?.name} on {formatDate(selectedVisit.scheduledDate)}</p>
              <div>
                <Label>Select Engineer</Label>
                <Select value={assignEngineerId} onValueChange={setAssignEngineerId}>
                  <SelectTrigger><SelectValue placeholder="Choose engineer" /></SelectTrigger>
                  <SelectContent>
                    {engineers.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.phone || e.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleAssign} disabled={isAssigning || !assignEngineerId}>
              {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
              Assign Engineer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}