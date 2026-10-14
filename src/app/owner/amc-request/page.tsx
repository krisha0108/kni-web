"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Loader2, CheckCircle2, ShieldAlert, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useRestaurant } from "@/contexts/restaurant-context";

// Equipment categories fetched from database (admin manages these)

const KITCHEN_TYPES = [
  { value: "CLOUD_KITCHEN", label: "Cloud Kitchen" },
  { value: "QSR", label: "QSR (Quick Service)" },
  { value: "FINE_DINE", label: "Fine Dine" },
  { value: "HOTEL", label: "Hotel" },
  { value: "CAFE", label: "Cafe" },
  { value: "CATERING", label: "Catering" },
  { value: "HOSPITAL", label: "Hospital" },
  { value: "INDUSTRIES", label: "Industries" },
  { value: "INSTITUTE", label: "Institute" },
];

const PLAN_TYPES = [
  {
    value: "STANDARD",
    label: "Standard",
    color: "bg-blue-100 text-blue-800",
    description: "Preventive + free breakdown visits",
  },
  {
    value: "PREMIUM",
    label: "Premium",
    color: "bg-purple-100 text-purple-800",
    description: "Preventive + breakdown + priority + parts discount",
  },
];

const VISIT_FREQUENCIES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "BI_MONTHLY", label: "Bi-Monthly (Every 2 months)" },
  { value: "QUARTERLY", label: "Quarterly (Every 3 months)" },
];

export default function AMCRequestPage() {
  const [restaurants, setRestaurants] = useState<{ id: string; name: string; city: string }[]>([]);
  const [equipmentCategories, setEquipmentCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    restaurantId: "",
    kitchenType: "",
    planType: "",
    visitFrequency: "",
    preferredStartDate: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const calendarDays = (() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calYear, calMonth, d); date.setHours(0, 0, 0, 0); days.push(date);
    }
    return days;
  })();

  const goToPrevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const goToNextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

  const selectedDateObj = formData.preferredStartDate ? new Date(formData.preferredStartDate + "T00:00:00") : null;
  const selectDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    setFormData({ ...formData, preferredStartDate: `${yyyy}-${mm}-${dd}` });
    setShowDatePicker(false);
  };

  const { toast } = useToast();
  const router = useRouter();
  const { selectedRestaurant } = useRestaurant();

  const userRole = selectedRestaurant?.role;
  const canCreate = userRole === "OWNER" || userRole === "MANAGER";

  useEffect(() => {
    Promise.all([
      fetch("/api/owner/restaurants/accessible").then((r) => r.json()),
      fetch("/api/app/categories").then((r) => r.json()),
    ])
      .then(([restData, catData]) => {
        if (restData.ok) {
          const approved = (restData.data || []).map((item: any) => item.restaurant);
          setRestaurants(approved);
        }
        if (catData.ok) {
          setEquipmentCategories(catData.data || []);
        }
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load restaurants and categories", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.restaurantId || selectedCategories.length === 0 || !formData.kitchenType || !formData.planType || !formData.visitFrequency || !formData.preferredStartDate) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/owner/amc-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          equipmentCategories: selectedCategories,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "AMC request submitted successfully!" });
        router.push("/owner/amc-requests");
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit request", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">You don't have permission to create AMC requests</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Request AMC
          </h1>
          <p className="text-muted-foreground">Submit an Annual Maintenance Contract request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Restaurant Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Restaurant</CardTitle>
            <CardDescription>Select the restaurant for AMC</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={formData.restaurantId} onValueChange={(v) => setFormData({ ...formData, restaurantId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select Restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name} ({r.city})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Equipment Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Categories <span className="text-destructive">*</span></CardTitle>
            <CardDescription>Select all equipment types that need maintenance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {equipmentCategories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={selectedCategories.includes(cat.name) ? "default" : "outline"}
                  className="cursor-pointer text-sm py-2 px-3"
                  onClick={() => toggleCategory(cat.name)}
                >
                  {selectedCategories.includes(cat.name) && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {cat.name}
                </Badge>
              ))}
            </div>
            {selectedCategories.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">{selectedCategories.length} selected</p>
            )}
          </CardContent>
        </Card>

        {/* Kitchen Type & Plan */}
        <Card>
          <CardHeader>
            <CardTitle>AMC Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kitchen / Outlet Type <span className="text-destructive">*</span></Label>
                <Select value={formData.kitchenType} onValueChange={(v) => setFormData({ ...formData, kitchenType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {KITCHEN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Visit Frequency <span className="text-destructive">*</span></Label>
                <Select value={formData.visitFrequency} onValueChange={(v) => setFormData({ ...formData, visitFrequency: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Plan Type Selection */}
            <div className="space-y-2">
              <Label>Preferred AMC Plan <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PLAN_TYPES.map((plan) => (
                  <div
                    key={plan.value}
                    onClick={() => setFormData({ ...formData, planType: plan.value })}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                      formData.planType === plan.value ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={plan.color}>{plan.label}</Badge>
                      {formData.planType === plan.value && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Preferred Start Date <span className="text-destructive">*</span></Label>
              <div
                className="flex items-center gap-3 rounded-lg border border-input bg-background px-4 py-3 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <span className={`flex-1 text-sm font-medium ${selectedDateObj ? "" : "text-muted-foreground"}`}>
                  {selectedDateObj
                    ? `${selectedDateObj.getDate()} ${MONTH_NAMES[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`
                    : "Tap to select date"}
                </span>
                <span className="text-muted-foreground text-xs">{showDatePicker ? "▲" : "▼"}</span>
              </div>

              {showDatePicker && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-bold min-w-[160px] text-center">
                        {MONTH_NAMES[calMonth]} {calYear}
                      </span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="text-center text-xs text-muted-foreground py-1 font-medium">{day}</div>
                      ))}
                      {calendarDays.map((date, idx) => {
                        if (!date) return <div key={`empty-${idx}`} />;
                        const isSelected = selectedDateObj?.toDateString() === date.toDateString();
                        const isToday = new Date().toDateString() === date.toDateString();
                        return (
                          <Button
                            key={date.toISOString()}
                            variant={isSelected ? "default" : "outline"}
                            className={`h-9 text-xs ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
                            onClick={() => selectDate(date)}
                          >
                            {date.getDate()}
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special requirements or notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              <><Shield className="mr-2 h-4 w-4" /> Submit AMC Request</>
            )}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}