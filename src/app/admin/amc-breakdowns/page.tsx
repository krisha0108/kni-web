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
import { AlertTriangle, Loader2, UserCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

const statusColors: Record<string, "default" | "success" | "warning" | "destructive"> = {
  REQUESTED: "warning",
  ASSIGNED: "default",
  IN_PROGRESS: "default",
  RESOLVED: "success",
  CHARGEABLE: "destructive",
};

const urgencyColors: Record<string, "default" | "warning" | "destructive"> = {
  LOW: "default",
  MEDIUM: "warning",
  HIGH: "destructive",
};

export default function AdminAMCBreakdownsPage() {
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedBreakdown, setSelectedBreakdown] = useState<any>(null);
  const [assignEngineerId, setAssignEngineerId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      const [bdRes, engRes] = await Promise.all([
        fetch(`/api/admin/amc-breakdowns?${params}`),
        fetch("/api/admin/engineers"),
      ]);
      const [bdData, engData] = await Promise.all([bdRes.json(), engRes.json()]);
      if (bdData.ok) setBreakdowns(bdData.data);
      if (engData.ok) setEngineers(engData.data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus]);

  const handleAssign = async () => {
    if (!selectedBreakdown || !assignEngineerId) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/admin/amc-breakdowns/${selectedBreakdown.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engineerId: assignEngineerId }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Engineer assigned to breakdown!" });
        setSelectedBreakdown(null);
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
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6" /> AMC Breakdowns</h1>
        <p className="text-muted-foreground">Manage breakdown requests from AMC contracts</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{breakdowns.length} breakdowns</span>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></CardContent></Card>
      ) : breakdowns.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No breakdown requests found</p></CardContent></Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead className="hidden md:table-cell">Covered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdowns.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <p className="font-medium">{b.equipmentName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{b.problemDesc}</p>
                  </TableCell>
                  <TableCell>{b.contract?.restaurant?.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{b.owner?.name}</TableCell>
                  <TableCell><Badge variant={urgencyColors[b.urgency] || "default"}>{b.urgency}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell">
                    {b.isCoveredByAMC
                      ? <Badge className="bg-green-100 text-green-800">Covered</Badge>
                      : <Badge className="bg-red-100 text-red-800">Chargeable</Badge>
                    }
                  </TableCell>
                  <TableCell><Badge variant={statusColors[b.status] || "default"}>{b.status}</Badge></TableCell>
                  <TableCell className="text-sm">{formatDate(b.createdAt)}</TableCell>
                  <TableCell>
                    {b.status === "REQUESTED" && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedBreakdown(b); setAssignEngineerId(""); }}>
                        <UserCheck className="h-3 w-3 mr-1" /> Assign
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={!!selectedBreakdown} onOpenChange={(o) => !o && setSelectedBreakdown(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Engineer to Breakdown</DialogTitle></DialogHeader>
          {selectedBreakdown && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                <p><span className="font-semibold">Equipment:</span> {selectedBreakdown.equipmentName}</p>
                <p><span className="font-semibold">Problem:</span> {selectedBreakdown.problemDesc}</p>
                <p><span className="font-semibold">Restaurant:</span> {selectedBreakdown.contract?.restaurant?.name}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={urgencyColors[selectedBreakdown.urgency]}>{selectedBreakdown.urgency} Priority</Badge>
                  {selectedBreakdown.isCoveredByAMC
                    ? <Badge className="bg-green-100 text-green-800">Covered by AMC</Badge>
                    : <Badge className="bg-red-100 text-red-800">Chargeable</Badge>
                  }
                </div>
              </div>
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
