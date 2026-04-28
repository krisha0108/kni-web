"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Loader2 } from "lucide-react";
import { ClientOnly } from "@/components/client-only";

interface LocationOption {
  id: string;
  name: string;
}

interface VendorLocation {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  adminNote: string | null;
  createdAt: string;
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

export default function VendorLocationsPage() {
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Request form state
  const [serviceStates, setServiceStates] = useState<LocationOption[]>([]);
  const [serviceCities, setServiceCities] = useState<LocationOption[]>([]);
  const [serviceAreas, setServiceAreas] = useState<LocationOption[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [requestNote, setRequestNote] = useState("");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const { toast } = useToast();

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/vendor/locations");
      const data = await response.json();
      if (data.ok) {
        setLocations(data.data?.items || data.data || []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch locations", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServiceStates = async () => {
    try {
      const response = await fetch("/api/public/locations?type=states");
      const data = await response.json();
      if (data.ok) {
        setServiceStates(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch states", error);
      toast({ title: "Error", description: "Failed to load states", variant: "destructive" });
    }
  };

  const fetchServiceCities = async (stateId: string) => {
    try {
      const response = await fetch(`/api/public/locations?type=cities&stateId=${stateId}`);
      const data = await response.json();
      if (data.ok) {
        setServiceCities(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch cities", error);
      toast({ title: "Error", description: "Failed to load cities", variant: "destructive" });
    }
  };

  const fetchServiceAreas = async (cityId: string) => {
    try {
      const response = await fetch(`/api/public/locations?type=areas&cityId=${cityId}`);
      const data = await response.json();
      if (data.ok) {
        setServiceAreas(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch areas", error);
      toast({ title: "Error", description: "Failed to load areas", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchServiceStates();
  }, []);

  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedCityId("");
    setServiceCities([]);
    setServiceAreas([]);
    setSelectedAreaIds([]);
    if (stateId) fetchServiceCities(stateId);
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    setServiceAreas([]);
    setSelectedAreaIds([]);
    if (cityId) fetchServiceAreas(cityId);
  };

  const toggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    );
  };

  const handleSubmitRequest = async () => {
    if (selectedAreaIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one area", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/vendor/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaIds: selectedAreaIds,
          note: requestNote.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: `${data.data.created} location request(s) submitted for approval`,
        });
        setIsRequestOpen(false);
        resetRequestForm();
        fetchLocations();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetRequestForm = () => {
    setSelectedStateId("");
    setSelectedCityId("");
    setServiceCities([]);
    setServiceAreas([]);
    setSelectedAreaIds([]);
    setRequestNote("");
  };

  const totalPages = useMemo(() => Math.ceil(locations.length / PAGE_SIZE) || 1, [locations.length]);
  const paginatedLocations = useMemo(() => locations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [locations, page]);

  const approved = paginatedLocations.filter((l) => l.status === "APPROVED");
  const pending = paginatedLocations.filter((l) => l.status === "PENDING");
  const rejected = paginatedLocations.filter((l) => l.status === "REJECTED");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="warning">Pending</Badge>;
      case "APPROVED": return <Badge variant="success">Approved</Badge>;
      case "REJECTED": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <ClientOnly>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Locations</h1>
            <p className="text-muted-foreground">
              Manage the areas where you provide services
            </p>
          </div>
          <Dialog open={isRequestOpen} onOpenChange={(open) => {
            setIsRequestOpen(open);
            if (!open) resetRequestForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Request New Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Request New Location</DialogTitle>
                <DialogDescription>
                  Select areas where you want to provide services. Your request will be reviewed by admin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select value={selectedStateId} onValueChange={handleStateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceStates.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select value={selectedCityId} onValueChange={handleCityChange} disabled={!selectedStateId}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedStateId ? "Select city" : "Select state first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {serviceAreas.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Areas</Label>
                    <div className="grid gap-2 max-h-48 overflow-y-auto">
                      {serviceAreas.map((area) => (
                        <label
                          key={area.id}
                          className={`flex items-center gap-3 p-2 border rounded-lg cursor-pointer transition-colors ${
                            selectedAreaIds.includes(area.id)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAreaIds.includes(area.id)}
                            onChange={() => toggleArea(area.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{area.name}</span>
                        </label>
                      ))}
                    </div>
                    {selectedAreaIds.length > 0 && (
                      <p className="text-xs text-primary">{selectedAreaIds.length} area(s) selected</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Note (optional)</Label>
                  <Textarea
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="Any additional information for the admin..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmitRequest} disabled={isSaving || selectedAreaIds.length === 0}>
                  {isSaving ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MapPin className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No locations yet</h3>
            <p className="text-sm mt-1">Request locations where you want to provide services</p>
          </div>
        ) : (
          <>
            {/* Approved Locations */}
            {approved.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Approved Locations ({approved.length})</h2>
                <div className="border rounded-lg">
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Area</TableHead>
                        <TableHead>City</TableHead>
                        
                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approved.map((loc) => (
                        
                        <TableRow key={loc.id}>
                          <TableCell className="font-medium">{loc.area.name}</TableCell>
                          <TableCell>{loc.area.city.name}</TableCell>
                          <TableCell>{loc.area.city.state.name}</TableCell>
                          <TableCell>{getStatusBadge(loc.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                        
                        
                  
                </div>
              </div>
            )}

            {/* Pending Requests */}
            {pending.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Pending Requests ({pending.length})</h2>
                <div className="border rounded-lg">
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Area</TableHead>
                        <TableHead>City</TableHead>
                        
                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                      </TableRow>
                    </TableHeader>
                    
                    <TableBody>
                      {pending.map((loc) => (
                        <TableRow key={loc.id}>
                          <TableCell className="font-medium">{loc.area.name}</TableCell>
                          <TableCell>{loc.area.city.name}</TableCell>
                          
                          <TableCell>{loc.area.city.state.name}</TableCell>
                          <TableCell>{getStatusBadge(loc.status)}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(loc.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                          
                    
                        
                  
                </div>
              </div>
            )}

            {/* Rejected Requests */}
            {rejected.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Rejected Requests ({rejected.length})</h2>
                <div className="border rounded-lg">

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Area</TableHead>
                        <TableHead>City</TableHead>

                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {rejected.map((loc) => (
                        <TableRow key={loc.id}>
                          <TableCell className="font-medium">{loc.area.name}</TableCell>
                          <TableCell>{loc.area.city.name}</TableCell>

                          <TableCell>{loc.area.city.state.name}</TableCell>
                          <TableCell>{getStatusBadge(loc.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {loc.adminNote || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>




                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4 p-4">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>
    </ClientOnly>
  );
}