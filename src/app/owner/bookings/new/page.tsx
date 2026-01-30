"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Clock, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { useRestaurant } from "@/contexts/restaurant-context";

interface CartItem {
  id: string;
  quantity: number;
  serviceItem?: { id: string; name: string; price: number };
  partItem?: { id: string; name: string; price: number };
}

const timeSlots = [
  { value: "09:00-11:00", label: "9:00 AM - 11:00 AM" },
  { value: "11:00-13:00", label: "11:00 AM - 1:00 PM" },
  { value: "14:00-16:00", label: "2:00 PM - 4:00 PM" },
  { value: "16:00-18:00", label: "4:00 PM - 6:00 PM" },
];

export default function NewBookingPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTimeSlot, setPreferredTimeSlot] = useState("");
  const [notes, setNotes] = useState("");
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedRestaurant) return;

      try {
        setIsLoading(true);
        const cartRes = await fetch("/api/owner/cart");
        const cartData = await cartRes.json();

        if (cartData.ok && cartData.data) {
          // Cart items with proper quantity mapping
          const items = (cartData.data.items || []).map((item: any) => ({
            id: item.id,
            quantity: item.qty,
            serviceItem: item.serviceItem,
            partItem: item.partItem,
          }));
          setCartItems(items);
        }
      } catch (error) {
        console.error("Failed to load booking data:", error);
        toast({
          title: "Error",
          description: "Failed to load booking data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedRestaurant, toast]);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.serviceItem?.price || item.partItem?.price || 0;
      return total + price * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRestaurant) {
      toast({ title: "Error", description: "Please select a restaurant", variant: "destructive" });
      return;
    }
    if (!preferredDate) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }
    if (!preferredTimeSlot) {
      toast({ title: "Error", description: "Please select a time slot", variant: "destructive" });
      return;
    }
    if (cartItems.length === 0) {
      toast({ title: "Error", description: "Your cart is empty", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert date and time slot to ISO datetime strings
      const [startTime, endTime] = preferredTimeSlot.split("-");
      const slotStartDateTime = new Date(`${preferredDate}T${startTime}:00`).toISOString();
      const slotEndDateTime = new Date(`${preferredDate}T${endTime}:00`).toISOString();

      const response = await fetch("/api/owner/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.restaurantId,
          slotStartDateTime,
          slotEndDateTime,
        }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Booking created successfully" });
        router.push("/owner/bookings/" + data.data.id + "/payment");
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast({ title: "Error", description: "Failed to create booking", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Minimum date is tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/owner/cart")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cart
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
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
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/owner/cart")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Cart
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Book Service</h1>
        <p className="text-muted-foreground">Select your preferred date and time slot</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
                <CardDescription>Choose when and where you want the service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="restaurant">Restaurant</Label>
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedRestaurant?.restaurant.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use the restaurant switcher in the header to change restaurants
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Preferred Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        min={minDateStr}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeSlot">Preferred Time Slot *</Label>
                    <ClientOnly>
                    <Select value={preferredTimeSlot} onValueChange={setPreferredTimeSlot}>
                      <SelectTrigger>
                        <Clock className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Select time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </ClientOnly>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions or requirements..."
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !selectedRestaurant}
                >
                  {isSubmitting ? "Creating Booking..." : "Create Booking"}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item) => {
                const itemData = item.serviceItem || item.partItem;
                return (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {itemData?.name} x {item.quantity}
                    </span>
                    <span>{formatPrice((itemData?.price || 0) * item.quantity)}</span>
                  </div>
                );
              })}
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatPrice(calculateTotal())}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
