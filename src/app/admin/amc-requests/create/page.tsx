"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  Check,
  User,
  Building,
  Wrench,
  Shield,
  Loader2,
  Trash2,
  SkipForward,
  XCircle,
} from "lucide-react";

// --- Types ---
interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface Category {
  id: string;
  name: string;
}

interface EquipmentItem {
  id: string;
  name: string;
  category: { id: string; name: string } | null;
  brand: string | null;
  model: string | null;
}

// --- Constants ---
const STEPS = [
  { label: "Client", icon: User },
  { label: "Restaurant", icon: Building },
  { label: "Equipment", icon: Wrench },
  { label: "AMC Details", icon: Shield },
];

const KITCHEN_TYPES = [
  { value: "CLOUD_KITCHEN", label: "Cloud Kitchen" },
  { value: "QSR", label: "QSR" },
  { value: "FINE_DINE", label: "Fine Dine" },
  { value: "HOTEL", label: "Hotel" },
  { value: "CAFE", label: "Cafe" },
  { value: "CATERING", label: "Catering" },
];

const PLAN_TYPES = [
  { value: "BASIC", label: "Basic" },
  { value: "STANDARD", label: "Standard" },
  { value: "PREMIUM", label: "Premium" },
];

const VISIT_FREQUENCIES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "BI_MONTHLY", label: "Bi-Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
];

export default function AdminCreateAMCRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Owner
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerResults, setOwnerResults] = useState<Owner[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [showCreateOwner, setShowCreateOwner] = useState(false);
  const [newOwner, setNewOwner] = useState({ name: "", email: "", phone: "", password: "" });
  const [isCreatingOwner, setIsCreatingOwner] = useState(false);

  // Step 2: Restaurant
  const [ownerRestaurants, setOwnerRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({ name: "", address: "", city: "", pincode: "" });
  const [isCreatingRestaurant, setIsCreatingRestaurant] = useState(false);
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");

  // Active AMC check
  const [activeAMC, setActiveAMC] = useState<{ contractNumber: string; status: string } | null>(null);
  const [checkingAMC, setCheckingAMC] = useState(false);

  // Step 3: Equipment
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingEquipment, setExistingEquipment] = useState<EquipmentItem[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [addedEquipment, setAddedEquipment] = useState<EquipmentItem[]>([]);
  const [newEquipment, setNewEquipment] = useState({
    name: "",
    categoryId: "",
    brand: "",
    model: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    photoUrls: [] as string[],
  });
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);

  // Step 4: AMC Details
  const [amcData, setAmcData] = useState({
    kitchenType: "",
    equipmentCategories: [] as string[],
    planType: "",
    visitFrequency: "",
    preferredStartDate: "",
    notes: "",
  });

  // --- Owner search with debounce ---
  useEffect(() => {
    if (!ownerSearch || ownerSearch.length < 2) {
      setOwnerResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/admin/owners?search=${encodeURIComponent(ownerSearch)}&pageSize=10`);
        const data = await res.json();
        if (data.ok) {
          setOwnerResults(
            data.data.items.map((o: any) => ({ id: o.id, name: o.name, email: o.email, phone: o.phone }))
          );
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [ownerSearch]);

  // --- Fetch owner's restaurants when owner selected ---
  useEffect(() => {
    if (!selectedOwner) {
      setOwnerRestaurants([]);
      return;
    }

    fetch(`/api/admin/owners/${selectedOwner.id}/restaurants`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setOwnerRestaurants(data.data || []);
      })
      .catch(() => {});
  }, [selectedOwner]);

  // --- Fetch restaurant's existing equipment when restaurant selected ---
  useEffect(() => {
    if (!selectedRestaurant) {
      setExistingEquipment([]);
      return;
    }

    setIsLoadingEquipment(true);
    fetch(`/api/admin/equipment?restaurantId=${selectedRestaurant.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setExistingEquipment(data.data || []);
      })
      .catch(() => {})
      .finally(() => setIsLoadingEquipment(false));
  }, [selectedRestaurant]);

  // --- Check if restaurant has active AMC ---
  useEffect(() => {
    if (!selectedRestaurant || !selectedOwner) {
      setActiveAMC(null);
      return;
    }

    setCheckingAMC(true);
    setActiveAMC(null);
    fetch(`/api/admin/amc-requests?status=CONTRACT_ACTIVE`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          const active = (data.data || []).find(
            (r: any) => r.restaurantId === selectedRestaurant.id && r.owner?.id === selectedOwner.id
          );
          if (active?.proposal?.contract) {
            setActiveAMC({
              contractNumber: active.proposal.contract.contractNumber,
              status: active.proposal.contract.status,
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAMC(false));
  }, [selectedRestaurant, selectedOwner]);

  // --- Fetch categories ---
  useEffect(() => {
    fetch("/api/app/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setCategories(data.data || []);
      })
      .catch(() => {});
  }, []);

  // --- Fetch states ---
  useEffect(() => {
    fetch("/api/public/locations?type=states")
      .then((res) => res.json())
      .then((data) => { if (data.ok) setStates(data.data || []); })
      .catch(() => {});
  }, []);

  // --- Fetch cities when state selected ---
  useEffect(() => {
    if (selectedStateId) {
      fetch(`/api/public/locations?type=cities&stateId=${selectedStateId}`)
        .then((res) => res.json())
        .then((data) => { if (data.ok) setCities(data.data || []); })
        .catch(() => {});
    } else {
      setCities([]);
    }
  }, [selectedStateId]);

  // --- Handlers ---
  const handleCreateOwner = async () => {
    if (!newOwner.name || !newOwner.email || !newOwner.password) {
      toast({ title: "Error", description: "Name, email and password are required", variant: "destructive" });
      return;
    }

    setIsCreatingOwner(true);
    try {
      const res = await fetch("/api/admin/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOwner),
      });
      const data = await res.json();
      if (data.ok) {
        setSelectedOwner(data.data);
        setShowCreateOwner(false);
        setNewOwner({ name: "", email: "", phone: "", password: "" });
        toast({ title: "Success", description: "Client account created" });
      } else {
        toast({ title: "Error", description: data.error || "Failed to create client", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create client", variant: "destructive" });
    } finally {
      setIsCreatingOwner(false);
    }
  };

  const handleCreateRestaurant = async () => {
    if (!selectedOwner || !newRestaurant.name || !newRestaurant.address || !newRestaurant.city) {
      toast({ title: "Error", description: "Name, address and city are required", variant: "destructive" });
      return;
    }

    setIsCreatingRestaurant(true);
    try {
      const res = await fetch(`/api/admin/owners/${selectedOwner.id}/restaurants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRestaurant),
      });
      const data = await res.json();
      if (data.ok) {
        setSelectedRestaurant(data.data);
        setOwnerRestaurants((prev) => [...prev, data.data]);
        setShowCreateRestaurant(false);
        setNewRestaurant({ name: "", address: "", city: "", pincode: "" });
        toast({ title: "Success", description: "Restaurant created (auto-approved)" });
      } else {
        toast({ title: "Error", description: data.error || "Failed to create restaurant", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create restaurant", variant: "destructive" });
    } finally {
      setIsCreatingRestaurant(false);
    }
  };

  const handleAddEquipment = async () => {
    if (!selectedOwner || !selectedRestaurant || !newEquipment.name || !newEquipment.categoryId || !newEquipment.purchaseDate) {
      toast({ title: "Error", description: "Name, category and purchase date are required", variant: "destructive" });
      return;
    }

    setIsAddingEquipment(true);
    try {
      const res = await fetch("/api/admin/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: selectedOwner.id,
          restaurantId: selectedRestaurant.id,
          name: newEquipment.name,
          categoryId: newEquipment.categoryId,
          brand: newEquipment.brand || undefined,
          model: newEquipment.model || undefined,
          purchaseDate: new Date(newEquipment.purchaseDate).toISOString(),
          photoUrls: newEquipment.photoUrls.length > 0 ? newEquipment.photoUrls : undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAddedEquipment((prev) => [...prev, data.data]);
        setNewEquipment({
          name: "",
          categoryId: "",
          brand: "",
          model: "",
          purchaseDate: new Date().toISOString().split("T")[0],
          photoUrls: [],
        });
        setShowEquipmentForm(false);
        toast({ title: "Success", description: "Equipment added" });
      } else {
        toast({ title: "Error", description: data.error || "Failed to add equipment", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add equipment", variant: "destructive" });
    } finally {
      setIsAddingEquipment(false);
    }
  };

  const handleSubmitAMC = async () => {
    if (!selectedOwner || !selectedRestaurant) return;
    if (!amcData.kitchenType || amcData.equipmentCategories.length === 0 || !amcData.planType || !amcData.visitFrequency || !amcData.preferredStartDate) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/amc-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: selectedOwner.id,
          restaurantId: selectedRestaurant.id,
          ...amcData,
          notes: amcData.notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "AMC request created successfully!" });
        router.push("/admin/amc-requests");
      } else {
        toast({ title: "Error", description: data.error || "Failed to create AMC request", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create AMC request", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategory = (catName: string) => {
    setAmcData((prev) => ({
      ...prev,
      equipmentCategories: prev.equipmentCategories.includes(catName)
        ? prev.equipmentCategories.filter((c) => c !== catName)
        : [...prev.equipmentCategories, catName],
    }));
  };

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0: return !!selectedOwner;
      case 1: return !!selectedRestaurant && !activeAMC && !checkingAMC;
      case 2: return true; // equipment is optional
      case 3:
        return !!(amcData.kitchenType && amcData.equipmentCategories.length > 0 && amcData.planType && amcData.visitFrequency && amcData.preferredStartDate);
      default: return false;
    }
  }, [currentStep, selectedOwner, selectedRestaurant, activeAMC, checkingAMC, amcData]);

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/amc-requests")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Create AMC Request
          </h1>
          <p className="text-muted-foreground">Set up AMC for a client</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <div key={i} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && <div className={`h-px w-4 sm:w-8 ${isDone ? "bg-primary" : "bg-muted"}`} />}
              <button
                onClick={() => { if (isDone) setCurrentStep(i); }}
                disabled={!isDone && !isActive}
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Select or Create Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedOwner ? (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium">{selectedOwner.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOwner.email} {selectedOwner.phone ? `| ${selectedOwner.phone}` : ""}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectedOwner(null); setSelectedRestaurant(null); setOwnerRestaurants([]); setAddedEquipment([]); setExistingEquipment([]); setActiveAMC(null); }}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search existing client</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email or phone..."
                      value={ownerSearch}
                      onChange={(e) => setOwnerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {isSearching && <p className="text-sm text-muted-foreground">Searching...</p>}

                  {ownerResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {ownerResults.map((o) => (
                        <button
                          key={o.id}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                          onClick={() => { setSelectedOwner(o); setOwnerSearch(""); setOwnerResults([]); }}
                        >
                          <p className="font-medium">{o.name}</p>
                          <p className="text-sm text-muted-foreground">{o.email} {o.phone ? `| ${o.phone}` : ""}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {ownerSearch.length >= 2 && !isSearching && ownerResults.length === 0 && (
                    <p className="text-sm text-muted-foreground">No clients found</p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
                </div>

                {/* Create New */}
                {!showCreateOwner ? (
                  <Button variant="outline" className="w-full" onClick={() => setShowCreateOwner(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create New Client
                  </Button>
                ) : (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h3 className="font-medium">New Client Details</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Name <span className="text-destructive">*</span></Label>
                        <Input value={newOwner.name} onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })} placeholder="Client name" />
                      </div>
                      <div className="space-y-1">
                        <Label>Email <span className="text-destructive">*</span></Label>
                        <Input type="email" value={newOwner.email} onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })} placeholder="client@example.com" />
                      </div>
                      <div className="space-y-1">
                        <Label>Phone</Label>
                        <Input type="tel" value={newOwner.phone} onChange={(e) => setNewOwner({ ...newOwner, phone: e.target.value })} placeholder="+91-9876543210" />
                      </div>
                      <div className="space-y-1">
                        <Label>Password <span className="text-destructive">*</span></Label>
                        <Input type="password" value={newOwner.password} onChange={(e) => setNewOwner({ ...newOwner, password: e.target.value })} placeholder="Min 8 characters" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateOwner} disabled={isCreatingOwner}>
                        {isCreatingOwner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Create Client
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateOwner(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Select or Create Restaurant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRestaurant ? (
              <>
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="font-medium">{selectedRestaurant.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRestaurant.address}, {selectedRestaurant.city}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedRestaurant(null); setAddedEquipment([]); setExistingEquipment([]); setActiveAMC(null); }}>
                    Change
                  </Button>
                </div>

                {/* Active AMC Warning */}
                {checkingAMC && (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground bg-muted/50 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking existing AMC...
                  </div>
                )}
                {activeAMC && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-700">AMC Already Active</p>
                      <p className="text-sm text-red-600 mt-1">
                        Contract {activeAMC.contractNumber} is active for this restaurant. Use renewal instead of creating a new request.
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Existing restaurants */}
                {ownerRestaurants.length > 0 && (
                  <div className="space-y-2">
                    <Label>Existing Restaurants</Label>
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {ownerRestaurants.map((r) => (
                        <button
                          key={r.id}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedRestaurant(r)}
                        >
                          <p className="font-medium">{r.name}</p>
                          <p className="text-sm text-muted-foreground">{r.address}, {r.city}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {ownerRestaurants.length > 0 && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
                  </div>
                )}

                {/* Create New */}
                {!showCreateRestaurant ? (
                  <Button variant="outline" className="w-full" onClick={() => setShowCreateRestaurant(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create New Restaurant
                  </Button>
                ) : (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h3 className="font-medium">New Restaurant Details</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Name <span className="text-destructive">*</span></Label>
                        <Input value={newRestaurant.name} onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })} placeholder="Restaurant name" />
                      </div>
                      <div className="space-y-1">
                        <Label>State <span className="text-destructive">*</span></Label>
                        <Select value={selectedStateId} onValueChange={(v) => { setSelectedStateId(v); setNewRestaurant({ ...newRestaurant, city: "" }); }}>
                          <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                          <SelectContent>
                            {states.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>City <span className="text-destructive">*</span></Label>
                        <Select value={newRestaurant.city} onValueChange={(v) => setNewRestaurant({ ...newRestaurant, city: v })} disabled={!selectedStateId}>
                          <SelectTrigger><SelectValue placeholder={selectedStateId ? "Select City" : "Select State first"} /></SelectTrigger>
                          <SelectContent>
                            {cities.map((c) => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <Label>Address <span className="text-destructive">*</span></Label>
                        <Input value={newRestaurant.address} onChange={(e) => setNewRestaurant({ ...newRestaurant, address: e.target.value })} placeholder="Full address" />
                      </div>
                      <div className="space-y-1">
                        <Label>Pincode</Label>
                        <Input value={newRestaurant.pincode} onChange={(e) => setNewRestaurant({ ...newRestaurant, pincode: e.target.value })} placeholder="6 digit pincode" maxLength={6} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateRestaurant} disabled={isCreatingRestaurant}>
                        {isCreatingRestaurant ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Create Restaurant
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateRestaurant(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Equipment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing equipment for this restaurant */}
            {isLoadingEquipment ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading existing equipment...
              </div>
            ) : existingEquipment.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Existing Equipment ({existingEquipment.length})</Label>
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {existingEquipment.map((eq) => (
                    <div key={eq.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-medium">{eq.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {eq.category?.name}{eq.brand ? ` | ${eq.brand}` : ""}{eq.model ? ` | ${eq.model}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline">Existing</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No equipment found for this restaurant
              </div>
            )}

            {/* Newly added equipment */}
            {addedEquipment.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Newly Added</Label>
                {addedEquipment.map((eq, i) => (
                  <div key={eq.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200">
                    <div>
                      <p className="font-medium">{eq.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {eq.category?.name}{eq.brand ? ` | ${eq.brand}` : ""}{eq.model ? ` | ${eq.model}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary">Added</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Add equipment form */}
            {!showEquipmentForm ? (
              <Button variant="outline" className="w-full" onClick={() => setShowEquipmentForm(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Equipment
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">New Equipment</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Equipment Name <span className="text-destructive">*</span></Label>
                    <Input value={newEquipment.name} onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })} placeholder="e.g. Walk-in Cooler" />
                  </div>
                  <div className="space-y-1">
                    <Label>Category <span className="text-destructive">*</span></Label>
                    <Select value={newEquipment.categoryId} onValueChange={(v) => setNewEquipment({ ...newEquipment, categoryId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Brand</Label>
                    <Input value={newEquipment.brand} onChange={(e) => setNewEquipment({ ...newEquipment, brand: e.target.value })} placeholder="Brand name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Model</Label>
                    <Input value={newEquipment.model} onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })} placeholder="Model number" />
                  </div>
                  <div className="space-y-1">
                    <Label>Purchase Date <span className="text-destructive">*</span></Label>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newEquipment.purchaseDate}
                      onChange={(e) => setNewEquipment({ ...newEquipment, purchaseDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label>Equipment Photos (Optional)</Label>
                  <MultipleImageUpload
                    value={newEquipment.photoUrls}
                    onChange={(urls) => setNewEquipment({ ...newEquipment, photoUrls: urls })}
                    folder="equipment"
                    maxImages={5}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddEquipment} disabled={isAddingEquipment}>
                    {isAddingEquipment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add
                  </Button>
                  <Button variant="outline" onClick={() => setShowEquipmentForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> AMC Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p><span className="text-muted-foreground">Client:</span> <span className="font-medium">{selectedOwner?.name}</span></p>
              <p><span className="text-muted-foreground">Restaurant:</span> <span className="font-medium">{selectedRestaurant?.name}</span> ({selectedRestaurant?.city})</p>
              {addedEquipment.length > 0 && <p><span className="text-muted-foreground">Equipment:</span> <span className="font-medium">{addedEquipment.length} item(s)</span></p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Kitchen Type <span className="text-destructive">*</span></Label>
                <Select value={amcData.kitchenType} onValueChange={(v) => setAmcData({ ...amcData, kitchenType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select kitchen type" /></SelectTrigger>
                  <SelectContent>
                    {KITCHEN_TYPES.map((kt) => (
                      <SelectItem key={kt.value} value={kt.value}>{kt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Plan Type <span className="text-destructive">*</span></Label>
                <Select value={amcData.planType} onValueChange={(v) => setAmcData({ ...amcData, planType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    {PLAN_TYPES.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Visit Frequency <span className="text-destructive">*</span></Label>
                <Select value={amcData.visitFrequency} onValueChange={(v) => setAmcData({ ...amcData, visitFrequency: v })}>
                  <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>
                    {VISIT_FREQUENCIES.map((vf) => (
                      <SelectItem key={vf.value} value={vf.value}>{vf.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Preferred Start Date <span className="text-destructive">*</span></Label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={amcData.preferredStartDate}
                  onChange={(e) => setAmcData({ ...amcData, preferredStartDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            {/* Equipment Categories */}
            <div className="space-y-2">
              <Label>Equipment Categories <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = amcData.equipmentCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-input hover:bg-muted"
                      }`}
                    >
                      {isSelected && <Check className="inline h-3 w-3 mr-1" />}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
              {amcData.equipmentCategories.length === 0 && (
                <p className="text-xs text-muted-foreground">Select at least one category</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={amcData.notes}
                onChange={(e) => setAmcData({ ...amcData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="flex gap-2">
          {currentStep === 2 && (
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(3)}
            >
              <SkipForward className="mr-2 h-4 w-4" /> Skip
            </Button>
          )}

          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitAMC}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                <><Shield className="mr-2 h-4 w-4" /> Create AMC Request</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}