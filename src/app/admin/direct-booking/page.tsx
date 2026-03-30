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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  Check,
  User,
  Building2,
  Wrench,
  ShoppingCart,
  Calendar,
  ClipboardList,
  Loader2,
  Trash2,
  SkipForward,
  CalendarPlus,
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

interface SubCategory {
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

interface ServiceItemType {
  id: string;
  name: string;
  price: number;
  category: { id: string; name: string };
  subCategory?: { id: string; name: string } | null;
}

interface SelectedItem {
  type: "SERVICE" | "PART";
  id: string;
  name: string;
  price: number;
  qty: number;
  categoryName: string;
}

// --- Constants ---
const STEPS = [
  { label: "Owner", icon: User },
  { label: "Restaurant", icon: Building2 },
  { label: "Equipment", icon: Wrench },
  { label: "Services", icon: ShoppingCart },
  { label: "Schedule", icon: Calendar },
  { label: "Review", icon: ClipboardList },
];

const TIME_SLOTS = [
  { label: "9:00 AM - 11:00 AM", startHour: 9, endHour: 11 },
  { label: "11:00 AM - 1:00 PM", startHour: 11, endHour: 13 },
  { label: "2:00 PM - 4:00 PM", startHour: 14, endHour: 16 },
  { label: "4:00 PM - 6:00 PM", startHour: 16, endHour: 18 },
];

export default function AdminDirectBookingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 0: Owner
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerResults, setOwnerResults] = useState<Owner[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [showCreateOwner, setShowCreateOwner] = useState(false);
  const [newOwner, setNewOwner] = useState({ name: "", email: "", phone: "" });
  const [isCreatingOwner, setIsCreatingOwner] = useState(false);

  // Step 1: Restaurant
  const [ownerRestaurants, setOwnerRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({ name: "", address: "", city: "" });
  const [isCreatingRestaurant, setIsCreatingRestaurant] = useState(false);

  // Step 2: Equipment
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [existingEquipment, setExistingEquipment] = useState<EquipmentItem[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [newEquipment, setNewEquipment] = useState({ name: "", categoryId: "", subCategoryId: "", brand: "", model: "" });
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);
  const [skipEquipment, setSkipEquipment] = useState(false);

  // Step 3: Services & Parts
  const [serviceItems, setServiceItems] = useState<ServiceItemType[]>([]);
  const [partItems, setPartItems] = useState<ServiceItemType[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Step 4: Schedule
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

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
            (data.data?.items || data.data || []).map((o: any) => ({ id: o.id, name: o.name, email: o.email, phone: o.phone }))
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

  // --- Fetch owner's restaurants ---
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
      .catch(() => {
        toast({ title: "Error", description: "Failed to load restaurants", variant: "destructive" });
      });
  }, [selectedOwner]);

  // --- Fetch restaurant's equipment ---
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
      .catch(() => {
        toast({ title: "Error", description: "Failed to load equipment", variant: "destructive" });
      })
      .finally(() => setIsLoadingEquipment(false));
  }, [selectedRestaurant]);

  // --- Fetch categories ---
  useEffect(() => {
    fetch("/api/app/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setCategories(data.data || []);
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load categories", variant: "destructive" });
      });
  }, []);

  // --- Fetch subcategories when equipment category changes ---
  useEffect(() => {
    if (!newEquipment.categoryId) {
      setSubCategories([]);
      return;
    }
    fetch(`/api/admin/subcategories?categoryId=${newEquipment.categoryId}&pageSize=100`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setSubCategories(data.data?.items || data.data || []);
      })
      .catch(() => {});
  }, [newEquipment.categoryId]);

  // --- Fetch service and part items when Step 3 is active ---
  useEffect(() => {
    if (currentStep !== 3) return;

    setIsLoadingItems(true);
    const categoryParam = filterCategoryId && filterCategoryId !== "all" ? `&categoryId=${filterCategoryId}` : "";

    Promise.all([
      fetch(`/api/admin/services?pageSize=200${categoryParam}`).then((r) => r.json()),
      fetch(`/api/admin/parts?pageSize=200${categoryParam}`).then((r) => r.json()),
    ])
      .then(([servicesData, partsData]) => {
        if (servicesData.ok) setServiceItems(servicesData.data?.items || servicesData.data || []);
        if (partsData.ok) setPartItems(partsData.data?.items || partsData.data || []);
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load items", variant: "destructive" });
      })
      .finally(() => setIsLoadingItems(false));
  }, [currentStep, filterCategoryId]);

  // --- Handlers ---
  const handleCreateOwner = async () => {
    if (!newOwner.name || !newOwner.email || !newOwner.phone) {
      toast({ title: "Error", description: "Name, email and phone are required", variant: "destructive" });
      return;
    }

    setIsCreatingOwner(true);
    try {
      // Auto-generate password
      const autoPassword = `KNI@${newOwner.phone.slice(-4)}${Date.now().toString().slice(-4)}`;
      const res = await fetch("/api/admin/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newOwner, password: autoPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        setSelectedOwner({ ...data.data, phone: newOwner.phone });
        setShowCreateOwner(false);
        setNewOwner({ name: "", email: "", phone: "" });
        toast({ title: "Success", description: "Owner created. Password will be sent via SMS." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to create owner", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create owner", variant: "destructive" });
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
        setNewRestaurant({ name: "", address: "", city: "" });
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
    if (!selectedOwner || !selectedRestaurant || !newEquipment.name || !newEquipment.categoryId) {
      toast({ title: "Error", description: "Name and category are required", variant: "destructive" });
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
          subCategoryId: newEquipment.subCategoryId || undefined,
          brand: newEquipment.brand || undefined,
          model: newEquipment.model || undefined,
          purchaseDate: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const eq = data.data;
        setSelectedEquipment(eq);
        setExistingEquipment((prev) => [...prev, eq]);
        setShowEquipmentForm(false);
        setNewEquipment({ name: "", categoryId: "", subCategoryId: "", brand: "", model: "" });
        setSkipEquipment(false);
        toast({ title: "Success", description: "Equipment added and selected" });
      } else {
        toast({ title: "Error", description: data.error || "Failed to add equipment", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add equipment", variant: "destructive" });
    } finally {
      setIsAddingEquipment(false);
    }
  };

  const handleAddItem = (item: ServiceItemType, type: "SERVICE" | "PART") => {
    setSelectedItems((prev) => {
      const existing = prev.findIndex((si) => si.id === item.id && si.type === type);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 };
        return updated;
      }
      return [...prev, { type, id: item.id, name: item.name, price: item.price, qty: 1, categoryName: item.category?.name || "" }];
    });
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQty = (index: number, qty: number) => {
    if (qty < 1) return;
    setSelectedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], qty };
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!selectedOwner || !selectedRestaurant || selectedItems.length === 0 || !selectedDate || selectedTimeSlot === null) return;

    setIsSubmitting(true);
    try {
      const date = new Date(selectedDate);
      const slot = TIME_SLOTS[selectedTimeSlot];
      const slotStart = new Date(date);
      slotStart.setHours(slot.startHour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(slot.endHour, 0, 0, 0);

      const res = await fetch("/api/admin/direct-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: selectedOwner.id,
          restaurantId: selectedRestaurant.id,
          equipmentId: skipEquipment ? undefined : selectedEquipment?.id || undefined,
          items: selectedItems.map((item) => ({
            type: item.type,
            serviceItemId: item.type === "SERVICE" ? item.id : undefined,
            partItemId: item.type === "PART" ? item.id : undefined,
            qty: item.qty,
          })),
          slotStartDateTime: slotStart.toISOString(),
          slotEndDateTime: slotEnd.toISOString(),
          problemDescription: problemDescription || undefined,
          adminNotes: adminNotes || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Booking created successfully! Now assign an engineer." });
        router.push(`/admin/bookings/${data.data.bookingId}`);
      } else {
        toast({ title: "Error", description: data.error || "Failed to create booking", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create booking", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Computed ---
  const itemTotal = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const gstAmount = Math.round(itemTotal * 0.18);
  const totalAmount = itemTotal + gstAmount;

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0: return !!selectedOwner;
      case 1: return !!selectedRestaurant;
      case 2: return true; // equipment is optional
      case 3: return selectedItems.length > 0;
      case 4: return !!selectedDate && selectedTimeSlot !== null;
      case 5: return true; // review step
      default: return false;
    }
  }, [currentStep, selectedOwner, selectedRestaurant, selectedItems, selectedDate, selectedTimeSlot]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/bookings")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CalendarPlus className="h-6 w-6" />
            Direct Service Booking
          </h1>
          <p className="text-muted-foreground">Book a service on behalf of an owner</p>
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

      {/* =================== STEP 0: Owner =================== */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Select or Create Owner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedOwner ? (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium">{selectedOwner.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOwner.email} {selectedOwner.phone ? `| ${selectedOwner.phone}` : ""}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setSelectedOwner(null);
                  setSelectedRestaurant(null);
                  setOwnerRestaurants([]);
                  setExistingEquipment([]);
                  setSelectedEquipment(null);
                  setSkipEquipment(false);
                }}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search existing owner</Label>
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
                    <p className="text-sm text-muted-foreground">No owners found</p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
                </div>

                {/* Create New Owner */}
                {!showCreateOwner ? (
                  <Button variant="outline" className="w-full" onClick={() => setShowCreateOwner(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create New Owner
                  </Button>
                ) : (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h3 className="font-medium">New Owner Details</h3>
                    <p className="text-xs text-muted-foreground">Password will be auto-generated and sent via SMS</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Name <span className="text-destructive">*</span></Label>
                        <Input value={newOwner.name} onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })} placeholder="Owner name" />
                      </div>
                      <div className="space-y-1">
                        <Label>Email <span className="text-destructive">*</span></Label>
                        <Input type="email" value={newOwner.email} onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })} placeholder="owner@example.com" />
                      </div>
                      <div className="space-y-1">
                        <Label>Phone <span className="text-destructive">*</span></Label>
                        <Input type="tel" value={newOwner.phone} onChange={(e) => setNewOwner({ ...newOwner, phone: e.target.value })} placeholder="9876543210" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateOwner} disabled={isCreatingOwner}>
                        {isCreatingOwner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Create Owner
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

      {/* =================== STEP 1: Restaurant =================== */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Select or Create Restaurant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRestaurant ? (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium">{selectedRestaurant.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRestaurant.address}, {selectedRestaurant.city}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setSelectedRestaurant(null);
                  setExistingEquipment([]);
                  setSelectedEquipment(null);
                  setSkipEquipment(false);
                }}>
                  Change
                </Button>
              </div>
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

                {/* Create New Restaurant */}
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
                        <Label>City <span className="text-destructive">*</span></Label>
                        <Input value={newRestaurant.city} onChange={(e) => setNewRestaurant({ ...newRestaurant, city: e.target.value })} placeholder="City" />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <Label>Address <span className="text-destructive">*</span></Label>
                        <Input value={newRestaurant.address} onChange={(e) => setNewRestaurant({ ...newRestaurant, address: e.target.value })} placeholder="Full address" />
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

      {/* =================== STEP 2: Equipment (Optional) =================== */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" /> Equipment
              <Badge variant="secondary" className="ml-2">Optional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Skip toggle */}
            {skipEquipment ? (
              <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
                <p className="text-sm text-muted-foreground">Equipment skipped — general service booking</p>
                <Button variant="outline" size="sm" onClick={() => setSkipEquipment(false)}>Select Equipment</Button>
              </div>
            ) : selectedEquipment ? (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium">{selectedEquipment.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEquipment.category?.name}{selectedEquipment.brand ? ` | ${selectedEquipment.brand}` : ""}{selectedEquipment.model ? ` | ${selectedEquipment.model}` : ""}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedEquipment(null)}>Change</Button>
              </div>
            ) : (
              <>
                {/* Existing equipment */}
                {isLoadingEquipment ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading equipment...
                  </div>
                ) : existingEquipment.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Existing Equipment ({existingEquipment.length})</Label>
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {existingEquipment.map((eq) => (
                        <button
                          key={eq.id}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedEquipment(eq)}
                        >
                          <p className="font-medium">{eq.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {eq.category?.name}{eq.brand ? ` | ${eq.brand}` : ""}{eq.model ? ` | ${eq.model}` : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    No equipment found for this restaurant
                  </div>
                )}

                {/* Add equipment form */}
                {!showEquipmentForm ? (
                  <Button variant="outline" className="w-full" onClick={() => setShowEquipmentForm(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add New Equipment
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
                        <Select value={newEquipment.categoryId} onValueChange={(v) => setNewEquipment({ ...newEquipment, categoryId: v, subCategoryId: "" })}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {subCategories.length > 0 && (
                        <div className="space-y-1">
                          <Label>Sub-Category</Label>
                          <Select value={newEquipment.subCategoryId} onValueChange={(v) => setNewEquipment({ ...newEquipment, subCategoryId: v })}>
                            <SelectTrigger><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                            <SelectContent>
                              {subCategories.map((sc) => (
                                <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label>Brand</Label>
                        <Input value={newEquipment.brand} onChange={(e) => setNewEquipment({ ...newEquipment, brand: e.target.value })} placeholder="Brand name" />
                      </div>
                      <div className="space-y-1">
                        <Label>Model</Label>
                        <Input value={newEquipment.model} onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })} placeholder="Model number" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddEquipment} disabled={isAddingEquipment}>
                        {isAddingEquipment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Add & Select
                      </Button>
                      <Button variant="outline" onClick={() => setShowEquipmentForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* =================== STEP 3: Services & Parts =================== */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Select Services & Parts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category filter */}
            <div className="flex items-center gap-3">
              <Label className="whitespace-nowrap">Filter by Category:</Label>
              <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoadingItems ? (
              <div className="flex items-center gap-2 p-8 justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading items...
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Services */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-blue-600 flex items-center gap-1">
                    <Wrench className="h-4 w-4" /> Services ({serviceItems.length})
                  </h3>
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {serviceItems.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">No services found</p>
                    ) : (
                      serviceItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.category?.name} &middot; {formatPrice(item.price)}</p>
                          </div>
                          <Button size="sm" variant="outline" className="ml-2 shrink-0" onClick={() => handleAddItem(item, "SERVICE")}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Parts */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-orange-600 flex items-center gap-1">
                    <ShoppingCart className="h-4 w-4" /> Parts ({partItems.length})
                  </h3>
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {partItems.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">No parts found</p>
                    ) : (
                      partItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.category?.name} &middot; {formatPrice(item.price)}</p>
                          </div>
                          <Button size="sm" variant="outline" className="ml-2 shrink-0" onClick={() => handleAddItem(item, "PART")}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Selected Items ({selectedItems.length})</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Item</th>
                        <th className="text-center px-3 py-2 font-medium">Type</th>
                        <th className="text-right px-3 py-2 font-medium">Price</th>
                        <th className="text-center px-3 py-2 font-medium w-24">Qty</th>
                        <th className="text-right px-3 py-2 font-medium">Total</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedItems.map((item, idx) => (
                        <tr key={`${item.type}-${item.id}`}>
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant={item.type === "SERVICE" ? "default" : "secondary"}>{item.type}</Badge>
                          </td>
                          <td className="px-3 py-2 text-right">{formatPrice(item.price)}</td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value) || 1)}
                              className="w-16 text-center mx-auto h-8"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{formatPrice(item.price * item.qty)}</td>
                          <td className="px-3 py-2">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveItem(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex flex-col items-end gap-1 text-sm">
                  <div className="flex gap-8">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium w-24 text-right">{formatPrice(itemTotal)}</span>
                  </div>
                  <div className="flex gap-8">
                    <span className="text-muted-foreground">GST (18%):</span>
                    <span className="font-medium w-24 text-right">{formatPrice(gstAmount)}</span>
                  </div>
                  <div className="flex gap-8 text-base border-t pt-1">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold w-24 text-right">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* =================== STEP 4: Schedule & Problem =================== */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Schedule & Problem Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Date */}
              <div className="space-y-2">
                <Label>Service Date <span className="text-destructive">*</span></Label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={minDate}
                />
              </div>

              {/* Time Slot */}
              <div className="space-y-2">
                <Label>Time Slot <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedTimeSlot(i)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selectedTimeSlot === i
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-input hover:bg-muted"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Problem Description</Label>
              <Textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe the issue the owner is facing..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Admin Notes</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes (not visible to owner)..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* =================== STEP 5: Review & Book =================== */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Review & Confirm Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Owner */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-medium">Owner</p>
              <p className="font-medium">{selectedOwner?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedOwner?.email} {selectedOwner?.phone ? `| ${selectedOwner.phone}` : ""}</p>
            </div>

            {/* Restaurant */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-medium">Restaurant</p>
              <p className="font-medium">{selectedRestaurant?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedRestaurant?.address}, {selectedRestaurant?.city}</p>
            </div>

            {/* Equipment */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-medium">Equipment</p>
              {skipEquipment || !selectedEquipment ? (
                <p className="text-sm text-muted-foreground">No equipment selected (general service)</p>
              ) : (
                <>
                  <p className="font-medium">{selectedEquipment.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEquipment.category?.name}{selectedEquipment.brand ? ` | ${selectedEquipment.brand}` : ""}{selectedEquipment.model ? ` | ${selectedEquipment.model}` : ""}
                  </p>
                </>
              )}
            </div>

            {/* Schedule */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-medium">Schedule</p>
              <p className="font-medium">
                {selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : ""}
              </p>
              <p className="text-sm text-muted-foreground">{selectedTimeSlot !== null ? TIME_SLOTS[selectedTimeSlot].label : ""}</p>
            </div>

            {/* Problem */}
            {problemDescription && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-medium">Problem Description</p>
                <p className="text-sm">{problemDescription}</p>
              </div>
            )}

            {/* Admin Notes */}
            {adminNotes && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-medium">Admin Notes</p>
                <p className="text-sm">{adminNotes}</p>
              </div>
            )}

            {/* Items Table */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase font-medium">Items</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Item</th>
                      <th className="text-center px-3 py-2 font-medium">Type</th>
                      <th className="text-right px-3 py-2 font-medium">Price</th>
                      <th className="text-center px-3 py-2 font-medium">Qty</th>
                      <th className="text-right px-3 py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedItems.map((item) => (
                      <tr key={`${item.type}-${item.id}`}>
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant={item.type === "SERVICE" ? "default" : "secondary"}>{item.type}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">{formatPrice(item.price)}</td>
                        <td className="px-3 py-2 text-center">{item.qty}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatPrice(item.price * item.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium w-24 text-right">{formatPrice(itemTotal)}</span>
                </div>
                <div className="flex gap-8">
                  <span className="text-muted-foreground">GST (18%):</span>
                  <span className="font-medium w-24 text-right">{formatPrice(gstAmount)}</span>
                </div>
                <div className="flex gap-8 text-lg border-t pt-1">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold w-24 text-right">{formatPrice(totalAmount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =================== Navigation Buttons =================== */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="flex gap-2">
          {currentStep === 2 && !skipEquipment && !selectedEquipment && (
            <Button
              variant="ghost"
              onClick={() => { setSkipEquipment(true); setCurrentStep(3); }}
            >
              <SkipForward className="mr-2 h-4 w-4" /> Skip
            </Button>
          )}

          {currentStep < 5 ? (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Booking...</>
              ) : (
                <><CalendarPlus className="mr-2 h-4 w-4" /> Confirm & Create Booking</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
