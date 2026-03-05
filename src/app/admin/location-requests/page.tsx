"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle, XCircle, FileText } from "lucide-react";
import { ClientOnly } from "@/components/client-only";

interface LocationRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  vendor: { id: string; name: string; email: string };
  area: {
    id: string;
    name: string;
    city: {
      id: string;
      name: string;
      state: { id: string; name: string };
    };
  };
}

export default function AdminLocationRequestsPage() {
  const [requests, setRequests] = useState<LocationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LocationRequest | null>(null);
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [adminNote, setAdminNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
      const response = await fetch("/api/admin/location-requests?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setRequests(data.data.items);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch requests", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [search, filterStatus]);

  const openActionDialog = (req: LocationRequest, action: "APPROVED" | "REJECTED") => {
    setSelectedRequest(req);
    setActionType(action);
    setAdminNote("");
    setIsActionOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest) return;
    if (actionType === "REJECTED" && !adminNote.trim()) {
      toast({ title: "Error", description: "Reason is required for rejection", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/location-requests/" + selectedRequest.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: actionType,
          adminNote: adminNote.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: `Request ${actionType === "APPROVED" ? "approved" : "rejected"} successfully`,
        });
        setIsActionOpen(false);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update request", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <ClientOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Vendor Location Requests</h1>
          <p className="text-muted-foreground">
            Review and manage vendor requests to serve specific locations
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendor or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Area</TableHead>
                
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    No location requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  
                  <TableRow key={req.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{req.vendor.name}</div>
                        <div className="text-xs text-muted-foreground">{req.vendor.email}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>{req.area.name}</TableCell>
                    <TableCell>{req.area.city.name}</TableCell>
                    <TableCell>{req.area.city.state.name}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </TableCell>
                    
                    <TableCell>
                      {req.status === "PENDING" ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => openActionDialog(req, "APPROVED")}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => openActionDialog(req, "REJECTED")}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {req.adminNote && `Note: ${req.adminNote}`}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
                    
                    
                  
                
            
                
          
        </div>

        {/* Action Dialog */}
        <Dialog open={isActionOpen} onOpenChange={(open) => {
          setIsActionOpen(open);
          if (!open) { setSelectedRequest(null); setAdminNote(""); }
        }}>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {actionType === "APPROVED" ? "Approve" : "Reject"} Location Request
              </DialogTitle>
              <DialogDescription>
                {selectedRequest && (
                  <>
                    Vendor: <strong>{selectedRequest.vendor.name}</strong> wants to serve{" "}
                    <strong>{selectedRequest.area.name}, {selectedRequest.area.city.name}, {selectedRequest.area.city.state.name}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedRequest?.note && (
                <div className="space-y-2">
                  <Label>Vendor Note</Label>
                  <p className="text-sm bg-muted p-3 rounded">{selectedRequest.note}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="adminNote">
                  {actionType === "REJECTED" ? "Rejection Reason *" : "Admin Note (optional)"}
                </Label>
                <Textarea
                  id="adminNote"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={actionType === "REJECTED" ? "Explain why this request is being rejected..." : "Optional note..."}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsActionOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAction}
                disabled={isSaving}
                variant={actionType === "APPROVED" ? "default" : "destructive"}
              >
                {isSaving ? "Processing..." : actionType === "APPROVED" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  );
}