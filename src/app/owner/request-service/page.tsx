"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Copy, ChevronLeft, ChevronRight, Loader2, AlertCircle, Smartphone
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}
import { formatPrice, formatDate } from "@/lib/utils";
import { useRestaurant } from "@/contexts/restaurant-context";
import { computeBookingTotal } from "@/lib/booking-pricing";
import { OfferSelector } from "@/app/owner/components/offer-selector";

// Constants
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
  const [paymentMode, setPaymentMode] = useState<"razorpay" | "manual">("razorpay");
  const [razorpaySuccess, setRazorpaySuccess] = useState(false);
  const [discount, setDiscount] = useState<{ percent: number; amount: number; source: string; candidates?: { offerId: string | null; source: string; percent: number; amount: number }[]; promoCodeError?: string; promoCodeOutbidBy?: string } | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [isLoadingDiscount, setIsLoadingDiscount] = useState(false);
  // Owner's pick from `discount.candidates` - defaults to whichever the
  // backend auto-picked (candidates[0], sorted best-first) until they choose
  // a different one themselves. `undefined` = "haven't picked yet" (distinct
  // from `null`, which means "explicitly chose No discount" - candidates
  // always include a null-offerId "No discount" entry, so `null` can't also
  // double as the not-yet-initialized sentinel without the two colliding).
  const [selectedOfferId, setSelectedOfferId] = useState<string | null | undefined>(undefined);
  // Whether `selectedOfferId` reflects an explicit OfferSelector pick rather
  // than the auto-picked best candidate. Without this, a stale auto-pick
  // "sticks" as candidates change (e.g. after applying a better promo code)
  // because it's still a *valid* candidate, just no longer the *best* one -
  // silently keeping a worse discount selected. Reset whenever the applied
  // promo code changes so that always re-triggers picking the new best.
  const hasManualOfferSelection = useRef(false);
  const handleSelectOffer = (offerId: string | null) => {
    hasManualOfferSelection.current = true;
    setSelectedOfferId(offerId);
  };

  // Item total, computed early so the discount-preview effect can depend on
  // it (every item here shares the equipment's category, so a single
  // categoryId + amount is enough for category-scoped offer matching).
  const itemTotal = useMemo(() => {
    let total = 0;
    selectedItems.forEach((item) => { total += item.price * item.qty; });
    return total;
  }, [selectedItems]);

  // Fetch the discount (custom rate / active offer / promo code) so the
  // preview here matches what /api/owner/bookings actually applies at
  // creation time.
  useEffect(() => {
    if (!selectedRestaurant || itemTotal <= 0) {
      setDiscount(null);
      return;
    }
    const params = new URLSearchParams({
      restaurantId: selectedRestaurant.restaurantId,
      amount: String(itemTotal),
    });
    if (categoryId) params.set("categoryId", categoryId);
    if (appliedPromoCode) params.set("promoCode", appliedPromoCode);
    setIsLoadingDiscount(true);
    fetch(`/api/owner/effective-discount?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.data) {
          setDiscount(data.data);
          // Keep the owner's manual pick if it's still an eligible candidate;
          // otherwise (first load, or their pick just became ineligible)
          // fall back to whatever the backend auto-picked as best.
          setSelectedOfferId((prev) => {
            const candidates: { offerId: string | null }[] = data.data.candidates || [];
            if (!hasManualOfferSelection.current) return candidates[0]?.offerId ?? null;
            const stillValid = prev !== undefined && candidates.some((c) => c.offerId === prev);
            return stillValid ? prev : candidates[0]?.offerId ?? null;
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingDiscount(false));
  }, [selectedRestaurant, itemTotal, categoryId, appliedPromoCode]);

  const applyPromoCode = () => {
    if (!promoCodeInput.trim()) return;
    hasManualOfferSelection.current = false;
    setAppliedPromoCode(promoCodeInput.trim().toUpperCase());
  };

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

  // The candidate the owner actually picked (or the auto-best one, if they
  // haven't touched the picker) - this, not always discount.amount, is what
  // gets charged.
  const selectedCandidate = useMemo(
    () => discount?.candidates?.find((c) => c.offerId === selectedOfferId),
    [discount, selectedOfferId]
  );

  // Calculate totals - mirrors the server-side computeBookingTotal used by
  // POST /api/owner/bookings, so this preview (and the amount charged via
  // Razorpay) matches what actually gets stored on the booking.
  const totals = useMemo(() => {
    const discountAmount = selectedCandidate ? selectedCandidate.amount : discount?.amount ?? 0;
    const discountSource = selectedCandidate ? selectedCandidate.source : discount?.source ?? null;
    const pricing = computeBookingTotal(itemTotal, discountAmount, tip);
    return {
      itemTotal,
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
      discountSource: pricing.discountAmount > 0 ? discountSource : null,
      gst: pricing.gstAmount,
      tip,
      total: pricing.totalAmount,
    };
  }, [itemTotal, tip, discount, selectedCandidate]);

  // Calendar state for month navigation
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Custom time picker state
  const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerAmPm, setPickerAmPm] = useState<"AM" | "PM">("AM");
  const [customSlot, setCustomSlot] = useState<{ id: string; label: string; start: string; end: string } | null>(null);

  const confirmTimePicker = () => {
    let h24 = pickerHour;
    if (pickerAmPm === "PM" && h24 !== 12) h24 += 12;
    if (pickerAmPm === "AM" && h24 === 12) h24 = 0;
    const endH24 = h24 + 2;
    const startStr = `${String(h24).padStart(2, "0")}:${String(pickerMinute).padStart(2, "0")}`;
    const endStr = `${String(endH24).padStart(2, "0")}:${String(pickerMinute).padStart(2, "0")}`;
    const endAmPm = endH24 >= 12 ? "PM" : "AM";
    const endH12 = endH24 > 12 ? endH24 - 12 : endH24 === 0 ? 12 : endH24;
    const label = `${pickerHour}:${String(pickerMinute).padStart(2, "0")} ${pickerAmPm} - ${endH12}:${String(pickerMinute).padStart(2, "0")} ${endAmPm}`;
    setCustomSlot({ id: "custom", label, start: startStr, end: endStr });
    setSelectedSlot("custom");
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startPad = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calYear, calMonth, d);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  }, [calMonth, calYear]);

  const goToPrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

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

  // Razorpay payment for service booking
  const paymentInProgress = useRef(false);
  const handleRazorpayPayment = async () => {
    if (paymentInProgress.current) return;
    if (!selectedRestaurant || selectedItems.size === 0 || !selectedDate || !selectedSlot) {
      toast({ title: "Error", description: "Please complete all steps first", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const slot = selectedSlot === "custom" ? customSlot : TIME_SLOTS.find((s) => s.id === selectedSlot);
      if (!slot) throw new Error("Invalid time slot");

      const slotStart = new Date(selectedDate);
      const [startHour, startMin] = slot.start.split(":").map(Number);
      slotStart.setHours(startHour, startMin, 0, 0);

      const slotEnd = new Date(selectedDate);
      const [endHour, endMin] = slot.end.split(":").map(Number);
      slotEnd.setHours(endHour, endMin, 0, 0);

      const items: any[] = [];
      selectedItems.forEach((item) => {
        items.push({
          itemType: item.type === "service" ? "SERVICE" : "PART",
          itemId: item.id,
          qty: item.qty,
          priceSnapshot: item.price,
        });
      });

      // 1. Create booking first (without payment screenshot)
      const bookingPayload = {
        restaurantId: selectedRestaurant.restaurantId,
        equipmentId: equipmentId || undefined,
        slotStartDateTime: slotStart.toISOString(),
        slotEndDateTime: slotEnd.toISOString(),
        problemDescription: problemDescription || `Service request for ${equipmentName}`,
        tip,
        items,
        promoCode: appliedPromoCode || undefined,
        offerId: selectedOfferId,
      };

      const bookingRes = await fetch("/api/owner/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      const bookingData = await bookingRes.json();
      if (!bookingData.ok) {
        throw new Error(bookingData.error || "Failed to create booking");
      }

      const bookingId = bookingData.data.id;

      // 2. Create Razorpay order
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totals.total,
          type: "SERVICE_BOOKING",
          referenceId: bookingId,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.ok) {
        throw new Error(orderData.error || "Failed to create payment order");
      }

      const { orderId, amount, currency, keyId, prefill } = orderData.data;

      // 3. Open Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: "KNI Super App",
        description: `Service Booking - ${equipmentName}`,
        order_id: orderId,
        prefill: prefill || {},
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "SERVICE_BOOKING",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.ok) {
              setRazorpaySuccess(true);
              setStep("confirm");
            } else {
              toast({ title: "Verification Failed", description: verifyData.error, variant: "destructive" });
            }
          } catch {
            toast({ title: "Error", description: "Payment verification failed", variant: "destructive" });
          }
          setIsSubmitting(false);
          paymentInProgress.current = false;
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            paymentInProgress.current = false;
            toast({ title: "Info", description: "Payment cancelled. Your booking has been created — you can pay later from My Bookings." });
          },
        },
        theme: { color: "#EF3A3A" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Payment was not completed",
          variant: "destructive",
        });
        setIsSubmitting(false);
        paymentInProgress.current = false;
      });
      rzp.open();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
      setIsSubmitting(false);
      paymentInProgress.current = false;
    }
  };

  // Submit booking (manual screenshot flow)
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
      const slot = selectedSlot === "custom" ? customSlot : TIME_SLOTS.find((s) => s.id === selectedSlot);
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
        promoCode: appliedPromoCode || undefined,
        offerId: selectedOfferId,
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
            {/* Date Selector Button */}
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false); }}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium">Select Date</p>
                  <p className="font-semibold">
                    {selectedDate
                      ? `${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                      : "Tap to select date"}
                  </p>
                </div>
                <span className="text-muted-foreground">{showDatePicker ? "▲" : "▼"}</span>
              </CardContent>
            </Card>

            {/* Calendar (collapsible) */}
            {showDatePicker && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
                      <span className="text-lg">&lsaquo;</span>
                    </Button>
                    <span className="text-sm font-bold min-w-[160px] text-center">
                      {MONTH_NAMES[calMonth]} {calYear}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
                      <span className="text-lg">&rsaquo;</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center text-xs text-muted-foreground py-2 font-medium">{day}</div>
                    ))}
                    {calendarDays.map((date, idx) => {
                      if (!date) return <div key={`empty-${idx}`} />;
                      const isSelected = selectedDate?.toDateString() === date.toDateString();
                      const isToday = new Date().toDateString() === date.toDateString();
                      return (
                        <Button
                          key={date.toISOString()}
                          variant={isSelected ? "default" : "outline"}
                          className={`h-10 ${isToday ? "ring-2 ring-primary ring-offset-2" : ""}`}
                          onClick={() => { setSelectedDate(date); setShowDatePicker(false); }}
                        >
                          {date.getDate()}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Time Selector Button */}
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false); }}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium">Select Time</p>
                  <p className="font-semibold">
                    {selectedSlot
                      ? (selectedSlot === "custom" ? customSlot?.label : TIME_SLOTS.find((s) => s.id === selectedSlot)?.label)
                      : "Tap to select time"}
                  </p>
                </div>
                <span className="text-muted-foreground">{showTimePicker ? "▲" : "▼"}</span>
              </CardContent>
            </Card>

            {/* Time Picker (collapsible) */}
            {showTimePicker && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Hour */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground text-center mb-2 uppercase tracking-wider">Hour</p>
                      <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
                        {HOURS.map((h) => (
                          <button key={h} className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${pickerHour === h ? "bg-primary text-white" : "hover:bg-muted text-foreground"}`} onClick={() => setPickerHour(h)}>
                            {String(h).padStart(2, "0")}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Minute */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground text-center mb-2 uppercase tracking-wider">Minute</p>
                      <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
                        {MINUTES.map((m) => (
                          <button key={m} className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${pickerMinute === m ? "bg-primary text-white" : "hover:bg-muted text-foreground"}`} onClick={() => setPickerMinute(m)}>
                            {String(m).padStart(2, "0")}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* AM/PM */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground text-center mb-2 uppercase tracking-wider">AM/PM</p>
                      <div className="flex flex-col gap-3 justify-center h-[200px]">
                        {(["AM", "PM"] as const).map((v) => (
                          <button key={v} className={`w-full py-5 rounded-xl text-base font-bold transition-colors ${pickerAmPm === v ? "bg-primary text-white" : "bg-muted hover:bg-muted/80 text-foreground"}`} onClick={() => setPickerAmPm(v)}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button className="w-full mt-4" size="lg" onClick={() => { confirmTimePicker(); setShowTimePicker(false); }}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm Time
                  </Button>
                </CardContent>
              </Card>
            )}

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
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Discount ({totals.discountPercent}%{totals.discountSource ? ` — ${totals.discountSource}` : ""})
                    </span>
                    <span className="text-green-600">-{formatPrice(totals.discountAmount)}</span>
                  </div>
                )}
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

                {/* Promo code */}
                <div className="pt-2">
                  {appliedPromoCode ? (
                    <div className="flex items-center justify-between gap-2 text-sm bg-muted rounded-md px-3 py-2">
                      <span>
                        Code <code className="font-mono font-medium">{appliedPromoCode}</code> applied
                        {discount?.promoCodeError ? (
                          <span className="block text-xs text-destructive mt-0.5">{discount.promoCodeError}</span>
                        ) : discount?.promoCodeOutbidBy ? (
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            Valid, but "{discount.promoCodeOutbidBy}" already gives you a bigger discount — that one's being used instead
                          </span>
                        ) : null}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => { hasManualOfferSelection.current = false; setAppliedPromoCode(null); setPromoCodeInput(""); }}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Promo code"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        className="h-9 text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={applyPromoCode} disabled={isLoadingDiscount || !promoCodeInput.trim()}>
                        Apply
                      </Button>
                    </div>
                  )}
                </div>

                {discount?.candidates && (
                  <div className="pt-2">
                    <OfferSelector
                      candidates={discount.candidates}
                      selectedOfferId={selectedOfferId}
                      onSelect={handleSelectOffer}
                    />
                  </div>
                )}
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

            {/* Razorpay Payment */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Secure Payment via Razorpay</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pay using UPI, Credit/Debit Card, NetBanking, or Wallets.
                      Your booking will be confirmed instantly.
                    </p>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-lg bg-red-50 border border-red-100 w-full">
                    <span className="text-sm font-medium text-red-700">Amount to Pay</span>
                    <span className="text-xl font-bold text-red-700">{formatPrice(totals.total)}</span>
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
                          {selectedSlot === "custom" ? customSlot?.label : TIME_SLOTS.find((s) => s.id === selectedSlot)?.label}
                        </p>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(totals.itemTotal)}</span>
                      </div>
                      {totals.discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Discount ({totals.discountPercent}%{totals.discountSource ? ` — ${totals.discountSource}` : ""})
                          </span>
                          <span className="text-green-600">-{formatPrice(totals.discountAmount)}</span>
                        </div>
                      )}
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
                            disabled={isSubmitting}
                            onClick={handleRazorpayPayment}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Pay {formatPrice(totals.total)} with Razorpay
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