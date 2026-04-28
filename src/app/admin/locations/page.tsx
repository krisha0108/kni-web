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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, MapPin } from "lucide-react";
import { ClientOnly } from "@/components/client-only";

interface ServiceState {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  _count: { cities: number };
}

interface ServiceCity {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  state: { id: string; name: string };
  _count: { areas: number };
}

interface ServiceArea {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  city: {
    id: string;
    name: string;
    state: { id: string; name: string };
  };
  _count: { locationRequests: number };
}

type Tab = "states" | "cities" | "areas";

export default function AdminLocationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("states");
  const { toast } = useToast();

  // States
  const [states, setStates] = useState<ServiceState[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [stateSearch, setStateSearch] = useState("");
  const [statesPage, setStatesPage] = useState(1);
  const [statesTotalPages, setStatesTotalPages] = useState(1);

  // Cities
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citySearch, setCitySearch] = useState("");
  const [cityFilterStateId, setCityFilterStateId] = useState("all");
  const [citiesPage, setCitiesPage] = useState(1);
  const [citiesTotalPages, setCitiesTotalPages] = useState(1);

  // Areas
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areaSearch, setAreaSearch] = useState("");
  const [areaFilterStateId, setAreaFilterStateId] = useState("all");
  const [areaFilterCityId, setAreaFilterCityId] = useState("all");
  const [filteredCitiesForArea, setFilteredCitiesForArea] = useState<ServiceCity[]>([]);
  const [areasPage, setAreasPage] = useState(1);
  const [areasTotalPages, setAreasTotalPages] = useState(1);

  // All states for dropdowns
  const [allStates, setAllStates] = useState<ServiceState[]>([]);
  const [allCities, setAllCities] = useState<ServiceCity[]>([]);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form
  const [formName, setFormName] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formStateId, setFormStateId] = useState("");
  const [formCityId, setFormCityId] = useState("");
  const [formCitiesForSelect, setFormCitiesForSelect] = useState<ServiceCity[]>([]);

  // Selected item for edit/delete
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const resetForm = () => {
    setFormName("");
    setFormIsActive(true);
    setFormSortOrder(0);
    setFormStateId("");
    setFormCityId("");
  };

  // Fetch all states for dropdowns
  const fetchAllStates = async () => {
    try {
      const response = await fetch("/api/admin/locations/states?includeInactive=true&pageSize=500");
      const data = await response.json();
      if (data.ok) {
        setAllStates(data.data?.items || data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch states", error);
    }
  };

  // Fetch all cities for dropdowns
  const fetchAllCities = async (stateId?: string) => {
    try {
      const params = new URLSearchParams({ includeInactive: "true", pageSize: "500" });
      if (stateId && stateId !== "all") params.set("stateId", stateId);
      const response = await fetch("/api/admin/locations/cities?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        return (data.data?.items || data.data || []) as ServiceCity[];
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch cities", error);
      return [];
    }
  };

  // ========== STATES ==========
  const fetchStates = async () => {
    try {
      setStatesLoading(true);
      const params = new URLSearchParams({ includeInactive: "true" });
      if (stateSearch) params.set("search", stateSearch);
      params.set("page", String(statesPage));
      params.set("pageSize", "20");
      const response = await fetch("/api/admin/locations/states?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setStatesTotalPages(Math.ceil(total / 20) || 1);
        setStates(Array.isArray(items) ? items : []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch states", variant: "destructive" });
    } finally {
      setStatesLoading(false);
    }
  };

  const handleCreateState = async () => {
    if (!formName) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/locations/states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, isActive: formIsActive, sortOrder: formSortOrder }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "State created successfully" });
        setIsCreateOpen(false);
        resetForm();
        fetchStates();
        fetchAllStates();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create state", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditState = async () => {
    if (!selectedItem || !formName) return;
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/locations/states/" + selectedItem.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, isActive: formIsActive, sortOrder: formSortOrder }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "State updated successfully" });
        setIsEditOpen(false);
        setSelectedItem(null);
        resetForm();
        fetchStates();
        fetchAllStates();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update state", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteState = async () => {
    if (!selectedItem) return;
    try {
      const response = await fetch("/api/admin/locations/states/" + selectedItem.id, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "State deleted successfully" });
        setIsDeleteOpen(false);
        setSelectedItem(null);
        fetchStates();
        fetchAllStates();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete state", variant: "destructive" });
    }
  };

  // ========== CITIES ==========
  const fetchCities = async () => {
    try {
      setCitiesLoading(true);
      const params = new URLSearchParams({ includeInactive: "true" });
      if (citySearch) params.set("search", citySearch);
      if (cityFilterStateId && cityFilterStateId !== "all") params.set("stateId", cityFilterStateId);
      params.set("page", String(citiesPage));
      params.set("pageSize", "20");
      const response = await fetch("/api/admin/locations/cities?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setCitiesTotalPages(Math.ceil(total / 20) || 1);
        setCities(Array.isArray(items) ? items : []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch cities", variant: "destructive" });
    } finally {
      setCitiesLoading(false);
    }
  };

  const handleCreateCity = async () => {
    if (!formName || !formStateId) {
      toast({ title: "Error", description: "Name and State are required", variant: "destructive" });
      return;
    }
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/locations/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateId: formStateId, name: formName, isActive: formIsActive, sortOrder: formSortOrder }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "City created successfully" });
        setIsCreateOpen(false);
        resetForm();
        fetchCities();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create city", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCity = async () => {
    if (!selectedItem || !formName || !formStateId) return;
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/locations/cities/" + selectedItem.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateId: formStateId, name: formName, isActive: formIsActive, sortOrder: formSortOrder }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "City updated successfully" });
        setIsEditOpen(false);
        setSelectedItem(null);
        resetForm();
        fetchCities();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update city", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCity = async () => {
    if (!selectedItem) return;
    try {
      const response = await fetch("/api/admin/locations/cities/" + selectedItem.id, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "City deleted successfully" });
        setIsDeleteOpen(false);
        setSelectedItem(null);
        fetchCities();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete city", variant: "destructive" });
    }
  };

  // ========== AREAS ==========
  const fetchAreas = async () => {
    try {
      setAreasLoading(true);
      const params = new URLSearchParams({ includeInactive: "true" });
      if (areaSearch) params.set("search", areaSearch);
      if (areaFilterStateId && areaFilterStateId !== "all") params.set("stateId", areaFilterStateId);
      if (areaFilterCityId && areaFilterCityId !== "all") params.set("cityId", areaFilterCityId);
      params.set("page", String(areasPage));
      params.set("pageSize", "20");
      const response = await fetch("/api/admin/locations/areas?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setAreasTotalPages(Math.ceil(total / 20) || 1);
        setAreas(Array.isArray(items) ? items : []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch areas", variant: "destructive" });
    } finally {
      setAreasLoading(false);
    }
  };

  const handleCreateArea = async () => {
    if (!formName || !formCityId) {
      toast({ title: "Error", description: "Name and City are required", variant: "destructive" });
      return;
    }
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/locations/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId: formCityId, name: formName, isActive: formIsActive, sortOrder: formSortOrder }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Area created successfully" });
        setIsCreateOpen(false);
        resetForm();
        fetchAreas();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create area", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditArea = async () => {
    if (!selectedItem || !formName || !formCityId) return;
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/locations/areas/" + selectedItem.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId: formCityId, name: formName, isActive: formIsActive, sortOrder: formSortOrder }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Area updated successfully" });
        setIsEditOpen(false);
        setSelectedItem(null);
        resetForm();
        fetchAreas();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update area", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArea = async () => {
    if (!selectedItem) return;
    try {
      const response = await fetch("/api/admin/locations/areas/" + selectedItem.id, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Area deleted successfully" });
        setIsDeleteOpen(false);
        setSelectedItem(null);
        fetchAreas();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete area", variant: "destructive" });
    }
  };

  // Effects
  useEffect(() => {
    fetchAllStates();
  }, []);

  useEffect(() => {
    if (activeTab === "states") fetchStates();
    if (activeTab === "cities") fetchCities();
    if (activeTab === "areas") fetchAreas();
  }, [activeTab]);

  useEffect(() => { fetchStates(); }, [stateSearch, statesPage]);
  useEffect(() => { fetchCities(); }, [citySearch, cityFilterStateId, citiesPage]);
  useEffect(() => { fetchAreas(); }, [areaSearch, areaFilterStateId, areaFilterCityId, areasPage]);

  // Cascading city filter for areas tab
  useEffect(() => {
    if (areaFilterStateId && areaFilterStateId !== "all") {
      fetchAllCities(areaFilterStateId).then(setFilteredCitiesForArea);
    } else {
      setFilteredCitiesForArea([]);
    }
    setAreaFilterCityId("all");
  }, [areaFilterStateId]);

  // Cascading city select for create/edit area form
  useEffect(() => {
    if (formStateId) {
      fetchAllCities(formStateId).then(setFormCitiesForSelect);
    } else {
      setFormCitiesForSelect([]);
    }
    setFormCityId("");
  }, [formStateId]);

  // Handlers
  const handleCreate = () => {
    if (activeTab === "states") handleCreateState();
    if (activeTab === "cities") handleCreateCity();
    if (activeTab === "areas") handleCreateArea();
  };

  const handleEdit = () => {
    if (activeTab === "states") handleEditState();
    if (activeTab === "cities") handleEditCity();
    if (activeTab === "areas") handleEditArea();
  };

  const handleDelete = () => {
    if (activeTab === "states") handleDeleteState();
    if (activeTab === "cities") handleDeleteCity();
    if (activeTab === "areas") handleDeleteArea();
  };

  const openEditDialog = (item: any) => {
    setSelectedItem(item);
    setFormName(item.name);
    setFormIsActive(item.isActive);
    setFormSortOrder(item.sortOrder);
    if (activeTab === "cities") {
      setFormStateId(item.state.id);
    }
    if (activeTab === "areas") {
      setFormStateId(item.city.state.id);
      // Need to load cities for this state before setting cityId
      fetchAllCities(item.city.state.id).then((c) => {
        setFormCitiesForSelect(c);
        setFormCityId(item.city.id);
      });
    }
    setIsEditOpen(true);
  };

  const canDelete = (item: any) => {
    if (activeTab === "states") return item._count.cities === 0;
    if (activeTab === "cities") return item._count.areas === 0;
    if (activeTab === "areas") return item._count.locationRequests === 0;
    return true;
  };

  const getDeleteWarning = (item: any) => {
    if (activeTab === "states" && item._count.cities > 0) {
      return `This state has ${item._count.cities} city(ies). Remove them first.`;
    }
    if (activeTab === "cities" && item._count.areas > 0) {
      return `This city has ${item._count.areas} area(s). Remove them first.`;
    }
    if (activeTab === "areas" && item._count.locationRequests > 0) {
      return `This area has ${item._count.locationRequests} vendor request(s). Remove them first.`;
    }
    return null;
  };

  const tabLabel = activeTab === "states" ? "State" : activeTab === "cities" ? "City" : "Area";

  return (
    <ClientOnly>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Service Locations</h1>
            <p className="text-muted-foreground">
              Manage states, cities, and areas where vendors can operate
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add {tabLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create {tabLabel}</DialogTitle>
                <DialogDescription>
                  Add a new {tabLabel.toLowerCase()} to the location hierarchy
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {activeTab === "cities" && (
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Select value={formStateId} onValueChange={setFormStateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {allStates.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {activeTab === "areas" && (
                  <>
                    <div className="space-y-2">
                      <Label>State *</Label>
                      <Select value={formStateId} onValueChange={setFormStateId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {allStates.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>City *</Label>
                      <Select value={formCityId} onValueChange={setFormCityId} disabled={!formStateId}>
                        <SelectTrigger>
                          <SelectValue placeholder={formStateId ? "Select city" : "Select state first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {formCitiesForSelect.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>{tabLabel} Name *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={`e.g., ${activeTab === "states" ? "Maharashtra" : activeTab === "cities" ? "Mumbai" : "Andheri West"}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-isActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="create-isActive">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isSaving}>
                  {isSaving ? "Creating..." : `Create ${tabLabel}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {(["states", "cities", "areas"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === "states") setStatesPage(1); if (tab === "cities") setCitiesPage(1); if (tab === "areas") setAreasPage(1); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={activeTab === "states" ? stateSearch : activeTab === "cities" ? citySearch : areaSearch}
              onChange={(e) => {
                if (activeTab === "states") { setStateSearch(e.target.value); setStatesPage(1); }
                if (activeTab === "cities") { setCitySearch(e.target.value); setCitiesPage(1); }
                if (activeTab === "areas") { setAreaSearch(e.target.value); setAreasPage(1); }
              }}
              className="pl-10"
            />
          </div>
          {activeTab === "cities" && (
            <Select value={cityFilterStateId} onValueChange={(v) => { setCityFilterStateId(v); setCitiesPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {allStates.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {activeTab === "areas" && (
            <>
              <Select value={areaFilterStateId} onValueChange={(v) => { setAreaFilterStateId(v); setAreasPage(1); }}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {allStates.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={areaFilterCityId} onValueChange={(v) => { setAreaFilterCityId(v); setAreasPage(1); }} disabled={areaFilterStateId === "all"}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={areaFilterStateId === "all" ? "Select state first" : "All Cities"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {filteredCitiesForArea.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* States Table */}
        {activeTab === "states" && (
          <div className="border rounded-lg">
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State Name</TableHead>
                  <TableHead>Cities</TableHead>
                  
                  <TableHead>Status</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {statesLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : states.length === 0 ? (
                  <TableRow>
                    
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      No states found
                    </TableCell>
                  </TableRow>
                ) : (
                  states.map((state) => (
                    
                    <TableRow key={state.id}>
                      <TableCell className="font-medium">{state.name}</TableCell>
                      <TableCell>{state._count.cities}</TableCell>
                      <TableCell>
                        <Badge variant={state.isActive ? "success" : "secondary"}>
                          {state.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>{state.sortOrder}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(state)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(state); setIsDeleteOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {statesTotalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4 p-4">
                <Button variant="outline" size="sm" onClick={() => setStatesPage((p) => Math.max(1, p - 1))} disabled={statesPage === 1}>Previous</Button>
                <span className="flex items-center px-4 text-sm">Page {statesPage} of {statesTotalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setStatesPage((p) => Math.min(statesTotalPages, p + 1))} disabled={statesPage === statesTotalPages}>Next</Button>
              </div>
            )}
          </div>
        )}

        {/* Cities Table */}
        {activeTab === "cities" && (
          <div className="border rounded-lg">
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City Name</TableHead>
                  <TableHead>State</TableHead>
                  
                  <TableHead>Areas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {citiesLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : cities.length === 0 ? (
                  <TableRow>
                    
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      No cities found
                    </TableCell>
                  </TableRow>
                ) : (
                  cities.map((city) => (
                    
                    <TableRow key={city.id}>
                      <TableCell className="font-medium">{city.name}</TableCell>
                      <TableCell><Badge variant="outline">{city.state.name}</Badge></TableCell>
                      <TableCell>{city._count.areas}</TableCell>
                      <TableCell>
                        <Badge variant={city.isActive ? "success" : "secondary"}>
                          {city.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>{city.sortOrder}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(city)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(city); setIsDeleteOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {citiesTotalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4 p-4">
                <Button variant="outline" size="sm" onClick={() => setCitiesPage((p) => Math.max(1, p - 1))} disabled={citiesPage === 1}>Previous</Button>
                <span className="flex items-center px-4 text-sm">Page {citiesPage} of {citiesTotalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCitiesPage((p) => Math.min(citiesTotalPages, p + 1))} disabled={citiesPage === citiesTotalPages}>Next</Button>
              </div>
            )}
          </div>
        )}

        {/* Areas Table */}
        {activeTab === "areas" && (
          <div className="border rounded-lg">
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area Name</TableHead>
                  <TableHead>City</TableHead>
                  
                  <TableHead>State</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {areasLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : areas.length === 0 ? (
                  <TableRow>
                    
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      No areas found
                    </TableCell>
                  </TableRow>
                ) : (
                  areas.map((area) => (
                    
                    <TableRow key={area.id}>
                      <TableCell className="font-medium">{area.name}</TableCell>
                      <TableCell><Badge variant="outline">{area.city.name}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{area.city.state.name}</Badge></TableCell>
                      <TableCell>{area._count.locationRequests}</TableCell>
                      
                      <TableCell>
                        <Badge variant={area.isActive ? "success" : "secondary"}>
                          {area.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>{area.sortOrder}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(area)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(area); setIsDeleteOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {areasTotalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4 p-4">
                <Button variant="outline" size="sm" onClick={() => setAreasPage((p) => Math.max(1, p - 1))} disabled={areasPage === 1}>Previous</Button>
                <span className="flex items-center px-4 text-sm">Page {areasPage} of {areasTotalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setAreasPage((p) => Math.min(areasTotalPages, p + 1))} disabled={areasPage === areasTotalPages}>Next</Button>
              </div>
            )}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) { setSelectedItem(null); resetForm(); }
        }}>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit {tabLabel}</DialogTitle>
              <DialogDescription>Update {tabLabel.toLowerCase()} details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {activeTab === "cities" && (
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select value={formStateId} onValueChange={setFormStateId}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {allStates.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {activeTab === "areas" && (
                <>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Select value={formStateId} onValueChange={setFormStateId}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {allStates.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Select value={formCityId} onValueChange={setFormCityId} disabled={!formStateId}>
                      <SelectTrigger><SelectValue placeholder={formStateId ? "Select city" : "Select state first"} /></SelectTrigger>
                      <SelectContent>
                        {formCitiesForSelect.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>{tabLabel} Name *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {tabLabel}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{selectedItem?.name}&quot;?
                {selectedItem && getDeleteWarning(selectedItem) && (
                  <span className="block mt-2 text-red-600">
                    {getDeleteWarning(selectedItem)}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={selectedItem ? !canDelete(selectedItem) : false}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ClientOnly>
  );
}