"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Gift, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useRestaurant } from "@/contexts/restaurant-context";

interface Offer {
  id: string;
  name: string;
  type: "FIRST_BOOKING" | "PROMOTIONAL";
  discountPercent: number;
  startDate: string | null;
  endDate: string | null;
  isUpcoming: boolean;
  eligible: boolean;
  category: { name: string } | null;
  imageUrl: string | null;
  description: string | null;
}

export default function OwnerOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { selectedRestaurant } = useRestaurant();

  useEffect(() => {
    const url = selectedRestaurant
      ? `/api/owner/offers?restaurantId=${selectedRestaurant.restaurantId}`
      : "/api/owner/offers";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setOffers(data.data);
        else toast({ title: "Error", description: data.error || "Failed to load offers", variant: "destructive" });
      })
      .catch(() => toast({ title: "Error", description: "Failed to load offers", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, [selectedRestaurant]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6" />
          Offers
        </h1>
        <p className="text-muted-foreground">
          Discounts running right now on service &amp; parts bookings. The best one applies automatically at checkout.
        </p>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No offers running right now</p>
            <p className="text-sm text-muted-foreground">Check back later for discounts on bookings</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {offers.map((offer) => (
            <Card key={offer.id} className={offer.eligible && !offer.isUpcoming ? "border-green-500/50 overflow-hidden" : "overflow-hidden"}>
              {offer.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={offer.imageUrl} alt={offer.name} className="w-full h-32 object-cover" />
              )}
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{offer.name}</p>
                    <Badge variant="outline" className="mt-1">
                      {offer.type === "FIRST_BOOKING" ? "First Booking Offer" : "Promotional"}
                    </Badge>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{offer.discountPercent}%</span>
                </div>

                {offer.description && (
                  <p className="text-sm text-muted-foreground">{offer.description}</p>
                )}

                <p className="text-sm text-muted-foreground">
                  {offer.startDate ? formatDate(offer.startDate) : "Started"} —{" "}
                  {offer.endDate ? formatDate(offer.endDate) : "No end date"}
                </p>

                {offer.category && (
                  <p className="text-xs text-muted-foreground">Applies to: {offer.category.name} only</p>
                )}

                {offer.isUpcoming ? (
                  <Badge variant="outline">Starts soon</Badge>
                ) : offer.type === "FIRST_BOOKING" && !offer.eligible ? (
                  <Badge variant="secondary">Already used — for new customers only</Badge>
                ) : (
                  <Badge variant="success">Applies to your next booking</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
