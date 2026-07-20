"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2, ShoppingCart, ArrowRight, ArrowLeft, Minus, Plus, Wrench, Package,
  Grid3X3, Calendar, Clock, Building2, CreditCard, Upload, CheckCircle2,
  Copy, QrCode, ChevronLeft, ChevronRight, ImageIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { computeBookingTotal, computeCategorySubtotals } from "@/lib/booking-pricing";
import { OfferSelector } from "@/app/owner/components/offer-selector";
import { useRestaurant } from "@/contexts/restaurant-context";

const TIME_SLOTS = [
  { id: "morning", label: "9:00 AM - 11:00 AM", start: "09:00", end: "11:00" },
  { id: "midday", label: "11:00 AM - 1:00 PM", start: "11:00", end: "13:00" },
  { id: "afternoon", label: "2:00 PM - 4:00 PM", start: "14:00", end: "16:00" },
  { id: "evening", label: "4:00 PM - 6:00 PM", start: "16:00", end: "18:00" },
];

const TIP_OPTIONS = [50, 75, 100];

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  category?: Category;
  subCategory?: SubCategory;
}

interface PartItem {
  id: string;
  name: string;
  price: number;
  category?: Category;
  subCategory?: SubCategory;
}

interface CartItem {
  id: string;
  qty: number;
  priceSnapshot: number;
  itemType: "SERVICE" | "PART";
  serviceItem?: ServiceItem;
  partItem?: PartItem;
}

interface Cart {
  id: string;
  items: CartItem[];
  discountPercent?: number;
  discountAmount?: number;
  discountSource?: string | null;
  promoCode?: string | null;
  promoCodeError?: string | null;
  promoCodeOutbidBy?: string | null;
}

interface GroupedCategory {
  categoryId: string;
  categoryName: string;
  heroImage: string;
  services: CartItem[];
  parts: CartItem[];
}

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  status: string;
}

interface PaymentSettings {
  qrCodeImageUrl: string;
  upiId: string;
  accountHolderName: string;
  instructions?: string;
}

// Hero images for categories
const CATEGORY_IMAGES: Record<string, string> = {
  default: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800&auto=format&fit=crop",
};

export default function RequestNowPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  // All cart item ids ever seen, so fetchCart can tell "genuinely new item
  // (auto-select)" apart from "existing item the owner deselected" instead
  // of resetting the whole selection on every refresh.
  const knownItemIdsRef = useRef<Set<string>>(new Set());
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Booking flow state
  const [step, setStep] = useState<"cart" | "date" | "restaurant" | "payment" | "confirm">("cart");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [tip, setTip] = useState(0);
  const [problemDescription, setProblemDescription] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const { selectedRestaurant: globalSelectedRestaurant } = useRestaurant();

  // Fetch cart - restaurant-scoped, so an owner with multiple restaurants
  // always sees pricing/discounts for the SAME restaurant the booking will
  // actually be created for (selectedRestaurant, chosen in the "restaurant"
  // step below), not whichever one the server would otherwise guess.
  const fetchCart = async () => {
    if (!selectedRestaurant) return;
    try {
      setIsLoading(true);
      const response = await fetch(`/api/owner/cart?restaurantId=${selectedRestaurant}`);
      const data = await response.json();
      if (data.ok) {
        setCart(data.data);
        const currentItemIds: string[] = data.data.items?.map((item: CartItem) => item.id) || [];
        // Preserve items the owner already deselected - only auto-select ids
        // that are genuinely new (never seen before this session). A
        // wholesale reset here would silently re-select everything on every
        // quantity change/removal, making the checkboxes decorative.
        //
        // Snapshot the ref's CURRENT Set before mutating it, and close over
        // that snapshot (not the live ref) inside the updater - setState's
        // updater only runs on React's next render pass, by which point a
        // ref mutated synchronously right here would already reflect the
        // "new" ids, making every id look "already known" and defeating the
        // new-vs-known distinction entirely.
        const previouslyKnownIds = knownItemIdsRef.current;
        knownItemIdsRef.current = new Set(currentItemIds);
        setSelectedItems((prev) => {
          const next = new Set<string>();
          for (const id of currentItemIds) {
            if (previouslyKnownIds.has(id)) {
              if (prev.has(id)) next.add(id);
            } else {
              next.add(id);
            }
          }
          return next;
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch cart",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply/remove a promo code without resetting the item-selection state a
  // full fetchCart() would (owners can deselect individual cart items).
  const refreshCartPricing = async () => {
    if (!selectedRestaurant) return { ok: false };
    const res = await fetch(`/api/owner/cart?restaurantId=${selectedRestaurant}`);
    const data = await res.json();
    if (data.ok) {
      setCart((prev) =>
        prev
          ? {
              ...prev,
              discountPercent: data.data.discountPercent,
              discountAmount: data.data.discountAmount,
              discountSource: data.data.discountSource,
              promoCode: data.data.promoCode,
              promoCodeError: data.data.promoCodeError,
              promoCodeOutbidBy: data.data.promoCodeOutbidBy,
            }
          : data.data
      );
    }
    return data;
  };

  const applyPromoCode = async () => {
    if (!promoCodeInput.trim() || !selectedRestaurant) return;
    setIsApplyingPromo(true);
    try {
      const res = await fetch("/api/owner/cart/promo-code", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCodeInput.trim(), restaurantId: selectedRestaurant }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast({ title: "Error", description: data.error || "Failed to apply code", variant: "destructive" });
        return;
      }
      hasManualOfferSelection.current = false;
      const cartData = await refreshCartPricing();
      if (cartData.ok && cartData.data.promoCodeError) {
        toast({ title: "Code not applied", description: cartData.data.promoCodeError, variant: "destructive" });
      } else if (cartData.ok && cartData.data.promoCodeOutbidBy) {
        toast({
          title: "Code valid, but not the best deal",
          description: `"${cartData.data.promoCodeOutbidBy}" already gives you a bigger discount — that one's being used instead.`,
        });
        setPromoCodeInput("");
      } else {
        toast({ title: "Applied", description: "Promo code applied" });
        setPromoCodeInput("");
      }
    } catch {
      toast({ title: "Error", description: "Failed to apply code", variant: "destructive" });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const removePromoCode = async () => {
    if (!selectedRestaurant) return;
    setIsApplyingPromo(true);
    try {
      await fetch("/api/owner/cart/promo-code", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: null, restaurantId: selectedRestaurant }),
      });
      hasManualOfferSelection.current = false;
      await refreshCartPricing();
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Fetch restaurants
  const fetchRestaurants = async () => {
    try {
      setLoadingRestaurants(true);
      const response = await fetch("/api/owner/restaurants/accessible");
      const data = await response.json();
      if (data.ok) {
        const restaurants = (data.data || []).map((item: any) => item.restaurant);
        setRestaurants(restaurants);
        // Default to whichever restaurant is globally selected (the same one
        // the owner was browsing/adding cart items under) so this wizard's
        // pricing preview and the final booking always agree on which
        // restaurant's cart/discount to use - falls back to the first one
        // accessible only if there's no global selection.
        if (restaurants.length > 0) {
          const preferred = globalSelectedRestaurant
            ? restaurants.find((r: Restaurant) => r.id === globalSelectedRestaurant.restaurantId)
            : null;
          setSelectedRestaurant((preferred || restaurants[0]).id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch restaurants:", error);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // Fetch payment settings from admin
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

  useEffect(() => {
    fetchRestaurants();
    fetchPaymentSettings();
  }, []);

  // Cart is restaurant-scoped, so it can only be fetched once a restaurant
  // is known (fetchRestaurants() above auto-selects one on load).
  useEffect(() => {
    if (selectedRestaurant) fetchCart();
  }, [selectedRestaurant]);

  // Handle quantity update
  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setIsUpdating(itemId);
    try {
      const response = await fetch("/api/owner/cart/items/" + itemId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      const data = await response.json();
      if (data.ok) {
        fetchCart();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
    } finally {
      setIsUpdating(null);
    }
  };

  // Handle remove item
  const handleRemoveItem = async (itemId: string) => {
    setIsUpdating(itemId);
    try {
      const response = await fetch("/api/owner/cart/items/" + itemId, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.ok) {
        setSelectedItems((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        fetchCart();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
    } finally {
      setIsUpdating(null);
    }
  };

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Toggle all items in category
  const toggleCategorySelection = (category: GroupedCategory) => {
    const categoryItemIds = [...category.services, ...category.parts].map((item) => item.id);
    const allSelected = categoryItemIds.every((id) => selectedItems.has(id));

    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        categoryItemIds.forEach((id) => next.delete(id));
      } else {
        categoryItemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Group items by category
  const groupedByCategory = useMemo(() => {
    if (!cart?.items) return [];

    const groups: Record<string, GroupedCategory> = {};

    cart.items.forEach((item) => {
      const itemData = item.serviceItem || item.partItem;
      const category = itemData?.category;
      const categoryId = category?.id || "uncategorized";
      const categoryName = category?.name || "Uncategorized";

      if (!groups[categoryId]) {
        groups[categoryId] = {
          categoryId,
          categoryName,
          heroImage: CATEGORY_IMAGES[categoryId] || CATEGORY_IMAGES.default,
          services: [],
          parts: [],
        };
      }

      if (item.itemType === "SERVICE" || item.serviceItem) {
        groups[categoryId].services.push(item);
      } else {
        groups[categoryId].parts.push(item);
      }
    });

    return Object.values(groups);
  }, [cart?.items]);

  // Calculate totals for selected items
  const selectedItemsData = useMemo(() => {
    if (!cart?.items) return [];
    return cart.items.filter((item) => selectedItems.has(item.id));
  }, [cart?.items, selectedItems]);

  const itemTotal = useMemo(() => {
    return selectedItemsData.reduce((total, item) => {
      const price = item.serviceItem?.price || item.partItem?.price || item.priceSnapshot || 0;
      return total + price * item.qty;
    }, 0);
  }, [selectedItemsData]);

  // The discount stored on `cart` reflects the FULL, unfiltered cart -
  // re-fetch it scoped to only the currently selected items whenever the
  // selection changes, so the preview shown here matches what the server
  // will actually charge once handleSubmitBooking sends the same selection.
  const [selectionDiscount, setSelectionDiscount] = useState<{
    amount: number;
    source: string | null;
    candidates: { offerId: string | null; source: string; percent: number; amount: number }[];
  }>({ amount: 0, source: null, candidates: [] });
  // Owner's pick from `selectionDiscount.candidates` - defaults to whichever
  // the backend auto-picked until they choose a different one themselves.
  // `undefined` = "haven't picked yet", distinct from `null` ("explicitly
  // chose No discount") - see the identical note in request-service/page.tsx.
  const [selectedOfferId, setSelectedOfferId] = useState<string | null | undefined>(undefined);
  // Whether `selectedOfferId` reflects an explicit OfferSelector pick rather
  // than the auto-picked best candidate. Without this, a stale auto-pick
  // "sticks" as candidates change (e.g. after applying a better promo code)
  // because it's still a *valid* candidate, just no longer the *best* one -
  // silently keeping a worse discount selected. Reset on promo code changes
  // so applying/removing a code always re-triggers picking the new best.
  const hasManualOfferSelection = useRef(false);
  const handleSelectOffer = (offerId: string | null) => {
    hasManualOfferSelection.current = true;
    setSelectedOfferId(offerId);
  };

  useEffect(() => {
    if (!selectedRestaurant || selectedItemsData.length === 0) {
      setSelectionDiscount({ amount: 0, source: null, candidates: [] });
      return;
    }
    let cancelled = false;
    const categorySubtotals = computeCategorySubtotals(
      selectedItemsData.map((item) => ({
        categoryId: item.serviceItem?.category?.id || item.partItem?.category?.id || "uncategorized",
        amount: (item.serviceItem?.price || item.partItem?.price || item.priceSnapshot || 0) * item.qty,
      }))
    );
    const params = new URLSearchParams({
      restaurantId: selectedRestaurant,
      amount: String(itemTotal),
      categorySubtotals: JSON.stringify(categorySubtotals),
    });
    if (cart?.promoCode) params.set("promoCode", cart.promoCode);

    fetch(`/api/owner/effective-discount?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.ok) {
          const candidates = data.data.candidates || [];
          setSelectionDiscount({
            amount: data.data.amount || 0,
            source: data.data.amount > 0 ? data.data.source : null,
            candidates,
          });
          setSelectedOfferId((prev) => {
            if (!hasManualOfferSelection.current) return candidates[0]?.offerId ?? null;
            const stillValid = prev !== undefined && candidates.some((c: { offerId: string | null }) => c.offerId === prev);
            return stillValid ? prev : candidates[0]?.offerId ?? null;
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedItemsData, itemTotal, selectedRestaurant, cart?.promoCode]);

  const selectedCandidate = useMemo(
    () => selectionDiscount.candidates.find((c) => c.offerId === selectedOfferId),
    [selectionDiscount, selectedOfferId]
  );

  const pricing = useMemo(() => {
    const amount = selectedCandidate ? selectedCandidate.amount : selectionDiscount.amount;
    return computeBookingTotal(itemTotal, amount, tip);
  }, [itemTotal, selectionDiscount.amount, selectedCandidate, tip]);
  const discountAmount = pricing.discountAmount;
  const gstAmount = pricing.gstAmount;
  const payableAmount = pricing.totalAmount;

  // Generate next 30 days
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Copy UPI ID
  const copyUpiId = () => {
    if (paymentSettings?.upiId) {
      navigator.clipboard.writeText(paymentSettings.upiId);
      toast({ title: "Copied!", description: "UPI ID copied to clipboard" });
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For demo, create a local URL - in production, upload to cloud storage
    const url = URL.createObjectURL(file);
    setPaymentScreenshot(url);
    toast({ title: "Screenshot uploaded", description: "Payment proof added" });
  };

  // Submit booking
  const handleSubmitBooking = async () => {
    if (!selectedRestaurant || !selectedDate || !selectedSlot || selectedItemsData.length === 0) {
      toast({ title: "Error", description: "Please complete all steps", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const slot = TIME_SLOTS.find((s) => s.id === selectedSlot);
      const slotStart = new Date(selectedDate);
      const [startHour] = slot?.start.split(":").map(Number) || [9];
      slotStart.setHours(startHour, 0, 0, 0);

      const slotEnd = new Date(selectedDate);
      const [endHour] = slot?.end.split(":").map(Number) || [11];
      slotEnd.setHours(endHour, 0, 0, 0);

      // Send exactly the items the owner selected - the server's cart-based
      // fallback (used when `items` is omitted) books the ENTIRE cart
      // regardless of checkbox selection, which is what caused booked items
      // and the shown discount/total to silently diverge from what was
      // actually selected here.
      const items = selectedItemsData.map((item) => ({
        itemType: item.itemType,
        itemId: item.serviceItem?.id || item.partItem?.id || "",
        qty: item.qty,
        priceSnapshot: item.serviceItem?.price ?? item.partItem?.price ?? item.priceSnapshot ?? 0,
      }));

      const response = await fetch("/api/owner/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedRestaurant,
          slotStartDateTime: slotStart.toISOString(),
          slotEndDateTime: slotEnd.toISOString(),
          problemDescription,
          paymentScreenshotUrl: paymentScreenshot || undefined,
          tip,
          items,
          promoCode: cart?.promoCode || undefined,
          offerId: selectedOfferId,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success!", description: "Booking created successfully" });
        router.push(`/owner/bookings/${data.data.id}`);
      } else {
        throw new Error(data.error || "Failed to create booking");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render item row
  const renderItemRow = (item: CartItem, isService: boolean) => {
    const itemData = item.serviceItem || item.partItem;
    const price = itemData?.price || item.priceSnapshot || 0;
    const subCategory = item.serviceItem?.subCategory || item.partItem?.subCategory;
    const isSelected = selectedItems.has(item.id);

    return (
      <div
        key={item.id}
        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
          isSelected
            ? isService
              ? "bg-blue-50 border-blue-200"
              : "bg-orange-50 border-orange-200"
            : "bg-gray-50 border-gray-200 opacity-60"
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={() => toggleItemSelection(item.id)}
          className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
            isSelected
              ? isService
                ? "bg-blue-600 border-blue-600"
                : "bg-orange-600 border-orange-600"
              : "border-gray-300"
          }`}
        >
          {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
        </button>

        {/* Icon */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isService ? "bg-blue-100" : "bg-orange-100"
          }`}
        >
          {isService ? (
            <Wrench className="h-4 w-4 text-blue-600" />
          ) : (
            <Package className="h-4 w-4 text-orange-600" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{itemData?.name}</p>
          {subCategory && (
            <p className="text-xs text-muted-foreground">{subCategory.name}</p>
          )}
        </div>

        {/* Quantity controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleUpdateQuantity(item.id, item.qty - 1)}
            disabled={isUpdating === item.id || item.qty <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-6 text-center text-sm font-medium">×{item.qty}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleUpdateQuantity(item.id, item.qty + 1)}
            disabled={isUpdating === item.id}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Price */}
        <p className={`text-sm font-bold min-w-[70px] text-right ${isService ? "text-blue-600" : "text-orange-600"}`}>
          {formatPrice(price * item.qty)}
        </p>

        {/* Remove */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => handleRemoveItem(item.id)}
          disabled={isUpdating === item.id}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Render category card
  const renderCategoryCard = (category: GroupedCategory, index: number) => {
    const categoryItemIds = [...category.services, ...category.parts].map((item) => item.id);
    const allSelected = categoryItemIds.every((id) => selectedItems.has(id));
    const categoryTotal = [...category.services, ...category.parts]
      .filter((item) => selectedItems.has(item.id))
      .reduce((total, item) => {
        const price = item.serviceItem?.price || item.partItem?.price || item.priceSnapshot || 0;
        return total + price * item.qty;
      }, 0);

    return (
      <Card key={category.categoryId} className="overflow-hidden flex-shrink-0 w-full">
        {/* Hero Image */}
        <div
          className="relative h-40 bg-cover bg-center"
          style={{ backgroundImage: `url(${category.heroImage})` }}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute top-3 left-3 right-3 flex justify-between">
            <Badge variant="secondary" className="bg-red-100 text-red-700">
              <Grid3X3 className="h-3 w-3 mr-1" />
              {category.categoryName}
            </Badge>
            <Button
              size="sm"
              variant={allSelected ? "default" : "secondary"}
              onClick={() => toggleCategorySelection(category)}
              className="h-7"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {allSelected ? "Selected" : "Select All"}
            </Button>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">{category.categoryName}</h3>
            <p className="font-bold text-primary">{formatPrice(categoryTotal)}</p>
          </div>

          {/* Services */}
          {category.services.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-600">
                <Wrench className="h-4 w-4" />
                <span className="text-sm font-semibold">Services ({category.services.length})</span>
              </div>
              <div className="space-y-2">
                {category.services.map((item) => renderItemRow(item, true))}
              </div>
            </div>
          )}

          {/* Parts */}
          {category.parts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-orange-600">
                <Package className="h-4 w-4" />
                <span className="text-sm font-semibold">Parts ({category.parts.length})</span>
              </div>
              <div className="space-y-2">
                {category.parts.map((item) => renderItemRow(item, false))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading cart...</p>
      </div>
    );
  }

  const items = cart?.items || [];

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Request Now</h1>
          <p className="text-muted-foreground">Book a service for your equipment</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Your cart is empty</p>
            <Button className="mt-4" onClick={() => router.push("/owner/equipment")}>
              Go to My Equipment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Request Now</h1>
          <p className="text-muted-foreground">
            {selectedItems.size} items selected • {groupedByCategory.length} categories
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Category Cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card Navigation */}
          {groupedByCategory.length > 1 && (
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="outline"
                size="icon"
                disabled={currentCardIndex === 0}
                onClick={() => setCurrentCardIndex((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentCardIndex + 1} of {groupedByCategory.length} categories
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={currentCardIndex === groupedByCategory.length - 1}
                onClick={() => setCurrentCardIndex((prev) => Math.min(groupedByCategory.length - 1, prev + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Current Category Card */}
          {groupedByCategory[currentCardIndex] && renderCategoryCard(groupedByCategory[currentCardIndex], currentCardIndex)}

          {/* Problem Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Describe the Problem</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="E.g., Not heating, strange noise, leaking water, display not working..."
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Date & Time Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Select Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Grid */}
              <div className="grid grid-cols-7 gap-2">
                {availableDates.slice(0, 14).map((date) => {
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`p-2 rounded-lg text-center border transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted border-border"
                      }`}
                    >
                      <div className="text-xs text-muted-foreground">
                        {date.toLocaleDateString("en", { weekday: "short" })}
                      </div>
                      <div className="font-bold">{date.getDate()}</div>
                    </button>
                  );
                })}
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`p-3 rounded-lg border text-sm transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-muted border-border"
                        }`}
                      >
                        <Clock className="h-4 w-4 mx-auto mb-1" />
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Restaurant Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Select Restaurant
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRestaurants ? (
                <p className="text-muted-foreground">Loading restaurants...</p>
              ) : restaurants.length === 0 ? (
                <p className="text-muted-foreground">No approved restaurants found</p>
              ) : (
                <div className="space-y-2">
                  {restaurants
                    .filter((r) => r.status === "APPROVED")
                    .map((restaurant) => {
                      const isSelected = selectedRestaurant === restaurant.id;
                      return (
                        <button
                          key={restaurant.id}
                          onClick={() => setSelectedRestaurant(restaurant.id)}
                          className={`w-full p-3 rounded-lg border text-left transition-colors ${
                            isSelected
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted border-border"
                          }`}
                        >
                          <div className="font-medium">{restaurant.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {restaurant.address}, {restaurant.city}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment
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
                        className="w-40 h-40 border-2 border-border rounded-lg object-contain bg-white"
                      />
                    </div>
                  )}

                  {/* UPI Details */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">UPI ID</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono">{paymentSettings.upiId}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyUpiId}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Account Name</span>
                      <span className="font-medium">{paymentSettings.accountHolderName}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="font-bold text-lg text-primary">{formatPrice(payableAmount)}</span>
                    </div>
                  </div>

                  {/* Payment Instructions */}
                  {paymentSettings.instructions && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
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

              {/* Tip Selection */}
              <div>
                <Label className="text-sm">Add a tip for the professional</Label>
                <div className="flex gap-2 mt-2">
                  {TIP_OPTIONS.map((amount) => (
                    <Button
                      key={amount}
                      variant={tip === amount ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTip(tip === amount ? 0 : amount)}
                    >
                      {formatPrice(amount)}
                      {amount === 75 && <Badge variant="secondary" className="ml-1 text-xs">Popular</Badge>}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Screenshot Upload */}
              <div>
                <Label className="text-sm">Upload Payment Screenshot</Label>
                <div className="mt-2">
                  {paymentScreenshot ? (
                    <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                      <img
                        src={paymentScreenshot}
                        alt="Payment screenshot"
                        className="w-full h-full object-contain"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setPaymentScreenshot(null)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload screenshot</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category breakdown */}
              <div className="space-y-2">
                {groupedByCategory.map((category) => {
                  const categoryTotal = [...category.services, ...category.parts]
                    .filter((item) => selectedItems.has(item.id))
                    .reduce((total, item) => {
                      const price = item.serviceItem?.price || item.partItem?.price || item.priceSnapshot || 0;
                      return total + price * item.qty;
                    }, 0);
                  if (categoryTotal === 0) return null;
                  return (
                    <div key={category.categoryId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{category.categoryName}</span>
                      <span>{formatPrice(categoryTotal)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Item Total</span>
                  <span>{formatPrice(itemTotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Discount ({pricing.discountPercent}%){(selectedCandidate?.source ?? selectionDiscount.source) ? ` — ${selectedCandidate?.source ?? selectionDiscount.source}` : ""}
                    </span>
                    <span className="text-green-600">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span>{formatPrice(gstAmount)}</span>
                </div>

                {/* Promo code */}
                <div className="pt-1">
                  {cart?.promoCode ? (
                    <div className="flex items-center justify-between gap-2 text-sm bg-muted rounded-md px-3 py-2">
                      <span>
                        Code <code className="font-mono font-medium">{cart.promoCode}</code> applied
                        {cart.promoCodeError ? (
                          <span className="block text-xs text-destructive mt-0.5">{cart.promoCodeError}</span>
                        ) : cart.promoCodeOutbidBy ? (
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            Valid, but "{cart.promoCodeOutbidBy}" already gives you a bigger discount — that one's being used instead
                          </span>
                        ) : null}
                      </span>
                      <Button size="sm" variant="ghost" onClick={removePromoCode} disabled={isApplyingPromo}>
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
                      <Button size="sm" variant="outline" onClick={applyPromoCode} disabled={isApplyingPromo || !promoCodeInput.trim()}>
                        Apply
                      </Button>
                    </div>
                  )}
                </div>

                {selectionDiscount.candidates.length > 0 && (
                  <div className="pt-1">
                    <OfferSelector
                      candidates={selectionDiscount.candidates}
                      selectedOfferId={selectedOfferId}
                      onSelect={handleSelectOffer}
                    />
                  </div>
                )}
                {tip > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tip</span>
                    <span>{formatPrice(tip)}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(payableAmount)}</span>
                </div>
              </div>

              {/* Booking Details Summary */}
              {(selectedDate || selectedSlot || selectedRestaurant) && (
                <div className="border-t pt-4 space-y-2 text-sm">
                  {selectedDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedDate.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</span>
                    </div>
                  )}
                  {selectedSlot && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{TIME_SLOTS.find((s) => s.id === selectedSlot)?.label}</span>
                    </div>
                  )}
                  {selectedRestaurant && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{restaurants.find((r) => r.id === selectedRestaurant)?.name}</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={
                  selectedItems.size === 0 ||
                  !selectedDate ||
                  !selectedSlot ||
                  !selectedRestaurant ||
                  isSubmitting
                }
                onClick={handleSubmitBooking}
              >
                {isSubmitting ? "Creating Booking..." : "Confirm Booking"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {selectedItems.size === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Select at least one item to proceed
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}