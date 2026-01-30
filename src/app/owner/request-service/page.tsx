"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ClientOnly } from "@/components/client-only";
import {
  ArrowLeft, ArrowRight, Minus, Plus, Wrench, Package,
  Calendar, Clock, Building2, CreditCard, Upload, CheckCircle2,
  Copy, ChevronLeft, ChevronRight, Loader2, AlertCircle
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import { useRestaurant } from "@/contexts/restaurant-context";

// Constants
const GST_RATE = 0.18;

const TIME_SLOTS = [
  { id: "morning", label: "9:00 AM - 11:00 AM", start: "09:00", end: "11:00" },
  { id: "midday", label: "11:00 AM - 1:00 PM", start: "11:00", end: "13:00" },
  { id: "afternoon", label: "2:00 PM - 4:00 PM", start: "14:00", end: "16:00" },
  { id: "evening", label: "4:00 PM - 6:00 PM", start: "16:00", end: "18:00" },
];

const TIP_OPTIONS = [50, 75, 100];

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  subcategory?: string;
}

interface PartItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  subcategory?: string;
}

interface SelectedItem {
  id: string;
  type: "service" | "part";
  name: string;
  price: number;
  qty: number;
}

interface PaymentSettings {
  qrCodeImageUrl: string;
  upiId: string;
  accountHolderName: string;
  instructions?: string;
}

export default function RequestServicePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { selectedRestaurant } = useRestaurant();

  // Equipment info from URL params
  const equipmentId = searchParams.get("equipmentId");
  const equipmentName = searchParams.get("equipmentName") || "Equipment";
  const categoryId = searchParams.get("categoryId");
  const categoryName = searchParams.get("categoryName") || "Equipment";
  const subCategoryId = searchParams.get("subCategoryId");
  const subCategoryName = searchParams.get("subCategoryName");

  // State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [parts, setParts] = useState<PartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);

  // Booking flow state
  const [step, setStep] = useState<"select" | "date" | "payment" | "confirm">("select");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [tip, setTip] = useState(0);
  const [problemDescription, setProblemDescription] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch services and parts by category
  useEffect(() => {
    const fetchServicesAndParts = async () => {
      if (!categoryId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.set("category_id", categoryId);
        if (subCategoryId) {
          params.set("subcategory_id", subCategoryId);
        }

        const [servicesRes, partsRes] = await Promise.all([
          fetch(`/api/app/services?${params.toString()}`),
          fetch(`/api/app/parts?${params.toString()}`),
        ]);

        const servicesData = await servicesRes.json();
        const partsData = await partsRes.json();

        if (servicesData.ok) {
          setServices(servicesData.data || []);
        }
        if (partsData.ok) {
          setParts(partsData.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch services/parts:", error);
        toast({
          title: "Error",
          description: "Failed to load services and parts",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchServicesAndParts();
  }, [categoryId, subCategoryId, toast]);

  // Fetch payment settings from admin
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const response = await fetch("/api/public/payment-settings");
        const data = await response.json();
        if (data.ok && data.data) {
          setPaymentSettings(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch payment settings:", error);
      }
    };
    fetchPaymentSettings();
  }, []);

  // Add/update item in selection
  const addItem = (item: ServiceItem | PartItem, type: "service" | "part") => {
    const key = `${type}:${item.id}`;
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      if (existing) {
        next.set(key, { ...existing, qty: existing.qty + 1 });
      } else {
        next.set(key, {
          id: item.id,
          type,
          name: item.name,
          price: item.price,
          qty: 1,
        });
      }
      return next;
    });
  };

  // Update quantity
  const updateQty = (key: string, delta: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const item = next.get(key);
      if (item) {
        const newQty = item.qty + delta;
        if (newQty <= 0) {
          next.delete(key);
        } else {
          next.set(key, { ...item, qty: newQty });
        }
      }
      return next;
    });
  };

  // Remove item
  const removeItem = (key: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    let itemTotal = 0;
    selectedItems.forEach((item) => {
      itemTotal += item.price * item.qty;
    });
    const gst = Math.round(itemTotal * GST_RATE);
    const total = itemTotal + gst + tip;
    return { itemTotal, gst, tip, total };
  }, [selectedItems, tip]);

  // Generate next 30 days for calendar
  const next30Days = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  // Handle payment screenshot upload
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "payment-proofs");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.ok && data.url) {
        setPaymentScreenshot(data.url);
        toast({ title: "Success", description: "Screenshot uploaded" });
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload screenshot",
        variant: "destructive",
      });
    }
  };

  // Submit booking
  const handleSubmit = async () => {
    if (!selectedRestaurant) {
      toast({ title: "Error", description: "Please select a restaurant", variant: "destructive" });
      return;
    }
    if (selectedItems.size === 0) {
      toast({ title: "Error", description: "Please select at least one service or part", variant: "destructive" });
      return;
    }
    if (!selectedDate || !selectedSlot) {
      toast({ title: "Error", description: "Please select date and time", variant: "destructive" });
      return;
    }
    if (!paymentScreenshot) {
      toast({ title: "Error", description: "Please upload payment screenshot", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const slot = TIME_SLOTS.find((s) => s.id === selectedSlot);
      if (!slot) throw new Error("Invalid time slot");

      // Build slot datetime
      const slotStart = new Date(selectedDate);
      const [startHour, startMin] = slot.start.split(":").map(Number);
      slotStart.setHours(startHour, startMin, 0, 0);

      const slotEnd = new Date(selectedDate);
      const [endHour, endMin] = slot.end.split(":").map(Number);
      slotEnd.setHours(endHour, endMin, 0, 0);

      // Build items array
      const items: any[] = [];
      selectedItems.forEach((item) => {
        items.push({
          itemType: item.type === "service" ? "SERVICE" : "PART",
          itemId: item.id,
          qty: item.qty,
          priceSnapshot: item.price,
        });
      });

      const payload = {
        restaurantId: selectedRestaurant.restaurantId,
        equipmentId: equipmentId || undefined,
        slotStartDateTime: slotStart.toISOString(),
        slotEndDateTime: slotEnd.toISOString(),
        problemDescription: problemDescription || `Service request for ${equipmentName}`,
        tip,
        items,
        paymentScreenshotUrl: paymentScreenshot,
      };

      const response = await fetch("/api/owner/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Booking created successfully!" });
        setStep("confirm");
      } else {
        throw new Error(data.error || "Failed to create booking");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case "select":
        return (
          <div className="space-y-6">
            {/* Equipment Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{equipmentName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {categoryName}{subCategoryName ? ` - ${subCategoryName}` : ""}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Services */}
            {services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Available Services ({services.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {services.map((service) => {
                    const key = `service:${service.id}`;
                    const selected = selectedItems.get(key);
                    return (
                      <div
                        key={service.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium">{service.name}</h4>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">{formatPrice(service.price)}</p>
                            {selected ? (
                              <div className="flex items-center gap-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQty(key, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center font-medium">{selected.qty}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQty(key, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => addItem(service, "service")}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Parts */}
            {parts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-500" />
                    Available Parts ({parts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parts.map((part) => {
                    const key = `part:${part.id}`;
                    const selected = selectedItems.get(key);
                    return (
                      <div
                        key={part.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          selected ? "border-orange-500 bg-orange-50" : "border-border hover:border-orange-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              <h4 className="font-medium">{part.name}</h4>
                            </div>
                            {part.description && (
                              <p className="text-sm text-muted-foreground mt-1 ml-4">{part.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-orange-600">{formatPrice(part.price)}</p>
                            {selected ? (
                              <div className="flex items-center gap-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQty(key, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center font-medium">{selected.qty}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQty(key, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => addItem(part, "part")}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* No services/parts message */}
            {!isLoading && services.length === 0 && parts.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">No services or parts available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    No services or parts have been added for this equipment category yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "date":
        return (
          <div className="space-y-6">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-xs text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                  {next30Days.map((date, idx) => {
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isToday = new Date().toDateString() === date.toDateString();
                    // Add empty cells for first week alignment
                    const emptyCells = idx === 0 ? Array(date.getDay()).fill(null) : [];
                    return (
                      <React.Fragment key={date.toISOString()}>
                        {emptyCells.map((_, i) => (
                          <div key={`empty-${i}`} />
                        ))}
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          className={`h-10 ${isToday ? "ring-2 ring-primary ring-offset-2" : ""}`}
                          onClick={() => setSelectedDate(date)}
                        >
                          {date.getDate()}
                        </Button>
                      </React.Fragment>
                    );
                  }).flat()}
                </div>
              </CardContent>
            </Card>

            {/* Time Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Select Time Slot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TIME_SLOTS.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={selectedSlot === slot.id ? "default" : "outline"}
                      className="h-auto py-3"
                      onClick={() => setSelectedSlot(slot.id)}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Problem Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Problem Description (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Describe the issue with your equipment..."
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>
        );

      case "payment":
        return (
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item Total</span>
                  <span>{formatPrice(totals.itemTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span>{formatPrice(totals.gst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip</span>
                  <span>{formatPrice(totals.tip)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span className="text-primary">{formatPrice(totals.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tip Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add a Tip</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {TIP_OPTIONS.map((amount) => (
                    <Button
                      key={amount}
                      variant={tip === amount ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setTip(tip === amount ? 0 : amount)}
                    >
                      {formatPrice(amount)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* UPI Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pay via UPI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentSettings ? (
                  <>
                    {/* QR Code Display */}
                    {paymentSettings.qrCodeImageUrl && (
                      <div className="flex justify-center p-4 bg-muted/50 rounded-lg">
                        <img
                          src={paymentSettings.qrCodeImageUrl}
                          alt="Payment QR Code"
                          className="w-48 h-48 border-2 border-border rounded-lg object-contain bg-white"
                        />
                      </div>
                    )}

                    {/* UPI Details */}
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <span className="text-sm text-muted-foreground">UPI ID</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(paymentSettings.upiId);
                            toast({ title: "Copied!", description: "UPI ID copied to clipboard" });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <p className="font-mono text-lg font-semibold">{paymentSettings.upiId}</p>
                      <div className="pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Account Name</span>
                        <p className="font-medium">{paymentSettings.accountHolderName}</p>
                      </div>
                    </div>

                    {/* Payment Instructions */}
                    {paymentSettings.instructions && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-1">Payment Instructions</h4>
                        <p className="text-sm text-blue-800 whitespace-pre-line">
                          {paymentSettings.instructions}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      Payment settings not configured. Please contact admin.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Upload Payment Screenshot</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    {paymentScreenshot ? (
                      <div className="space-y-2">
                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                        <p className="text-sm text-green-600">Screenshot uploaded</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPaymentScreenshot(null)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleScreenshotUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "confirm":
        return (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-center">Booking Confirmed!</h2>
              <p className="text-muted-foreground text-center mt-2">
                Your service request has been submitted successfully.
              </p>
              <Button className="mt-6" onClick={() => router.push("/owner/bookings")}>
                View My Bookings
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  if (!categoryId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Invalid Request</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please select equipment from the My Equipment page to request service.
            </p>
            <Button className="mt-4" onClick={() => router.push("/owner/equipment")}>
              Go to My Equipment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Request Service</h1>
            <p className="text-muted-foreground">
              {step === "select" && "Select services and parts for your equipment"}
              {step === "date" && "Choose your preferred date and time"}
              {step === "payment" && "Complete payment to confirm booking"}
              {step === "confirm" && "Booking confirmed"}
            </p>
          </div>
          {step !== "confirm" && (
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>

        {/* Progress Steps */}
        {step !== "confirm" && (
          <div className="flex items-center justify-center gap-2">
            {["select", "date", "payment"].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : ["select", "date", "payment"].indexOf(step) > idx
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < 2 && <div className="w-12 h-0.5 bg-muted mx-2" />}
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">{renderStepContent()}</div>

            {/* Sidebar - Order Summary */}
            {step !== "confirm" && (
              <div className="lg:col-span-1">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-base">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Restaurant */}
                    <div>
                      <p className="text-sm text-muted-foreground">Restaurant</p>
                      <p className="font-medium">
                        {selectedRestaurant?.restaurant.name || "Not selected"}
                      </p>
                    </div>

                    {/* Equipment */}
                    <div>
                      <p className="text-sm text-muted-foreground">Equipment</p>
                      <p className="font-medium">{equipmentName}</p>
                    </div>

                    {/* Selected Items */}
                    {selectedItems.size > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Selected Items ({selectedItems.size})
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {Array.from(selectedItems.values()).map((item) => (
                            <div
                              key={`${item.type}:${item.id}`}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                {item.type === "part" && (
                                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                                )}
                                <span className="truncate max-w-[120px]">{item.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  x{item.qty}
                                </Badge>
                              </div>
                              <span>{formatPrice(item.price * item.qty)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Date/Time */}
                    {selectedDate && selectedSlot && (
                      <div>
                        <p className="text-sm text-muted-foreground">Scheduled</p>
                        <p className="font-medium">
                          {formatDate(selectedDate.toISOString())}
                        </p>
                        <p className="text-sm">
                          {TIME_SLOTS.find((s) => s.id === selectedSlot)?.label}
                        </p>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(totals.itemTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">GST (18%)</span>
                        <span>{formatPrice(totals.gst)}</span>
                      </div>
                      {tip > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tip</span>
                          <span>{formatPrice(tip)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Total</span>
                        <span className="text-primary">{formatPrice(totals.total)}</span>
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="space-y-2 pt-4">
                      {step === "select" && (
                        <Button
                          className="w-full"
                          disabled={selectedItems.size === 0}
                          onClick={() => setStep("date")}
                        >
                          Continue
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                      {step === "date" && (
                        <>
                          <Button
                            className="w-full"
                            disabled={!selectedDate || !selectedSlot}
                            onClick={() => setStep("payment")}
                          >
                            Continue to Payment
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setStep("select")}
                          >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                          </Button>
                        </>
                      )}
                      {step === "payment" && (
                        <>
                          <Button
                            className="w-full"
                            disabled={!paymentScreenshot || isSubmitting}
                            onClick={handleSubmit}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                Confirm Booking
                                <CheckCircle2 className="h-4 w-4 ml-2" />
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setStep("date")}
                            disabled={isSubmitting}
                          >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </ClientOnly>
  );
}
