"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Check, Calendar } from "lucide-react";
import { getAMCDurationLabel } from "@/lib/amc";
import { formatPrice } from "@/lib/utils";

interface AMCPlan {
  id: string;
  name: string;
  description: string | null;
  duration: "MONTHLY" | "QUARTERLY" | "YEARLY";
  price: number;
  serviceLimit: number;
  featuresJson: string | string[] | null;
}

interface Restaurant {
  id: string;
  name: string;
}

export default function OwnerAMCPlansPage() {
  const [plans, setPlans] = useState<AMCPlan[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<AMCPlan | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [startDate, setStartDate] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchPlans();
    fetchRestaurants();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/owner/amc-plans");
      const data = await response.json();
      if (data.ok) {
        setPlans(data.data || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch AMC plans",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const response = await fetch("/api/owner/restaurants");
      const data = await response.json();
      if (data.ok && data.data) {
        const approved = Array.isArray(data.data)
          ? data.data.filter((r: any) => r.status === "APPROVED")
          : [];
        setRestaurants(approved);
        if (approved.length > 0) {
          setSelectedRestaurant(approved[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    }
  };

  const openSubscribeDialog = (plan: AMCPlan) => {
    setSelectedPlan(plan);
    // Set default start date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().split("T")[0]);
    setIsSubscribeOpen(true);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !selectedRestaurant || !startDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/owner/amc-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          restaurantId: selectedRestaurant,
          startDate: new Date(startDate).toISOString(),
          autoRenew,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Successfully subscribed to AMC plan",
        });
        setIsSubscribeOpen(false);
        router.push("/owner/amc-subscriptions");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to subscribe",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe to AMC plan",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AMC Plans</h1>
        <p className="text-muted-foreground">Choose an Annual Maintenance Contract plan for your restaurant</p>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-muted-foreground">No AMC plans available at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  <Badge variant="outline">{getAMCDurationLabel(plan.duration)}</Badge>
                </div>
                {plan.description && (
                  <CardDescription>{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div>
                  <p className="text-3xl font-bold">{formatPrice(plan.price)}</p>
                  <p className="text-sm text-muted-foreground">per {plan.duration.toLowerCase()} period</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Includes:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{plan.serviceLimit} service calls included</span>
                    </li>
                    {plan.featuresJson && (() => {
                      const features = typeof plan.featuresJson === 'string'
                        ? JSON.parse(plan.featuresJson)
                        : plan.featuresJson;
                      return Array.isArray(features) ? features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      )) : null;
                    })()}
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => openSubscribeDialog(plan)}>
                  Subscribe Now
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Subscribe Dialog */}
      <Dialog open={isSubscribeOpen} onOpenChange={setIsSubscribeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subscribe to {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="text-sm font-medium">{selectedPlan?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm font-medium">
                  {selectedPlan && getAMCDurationLabel(selectedPlan.duration)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Service Limit</span>
                <span className="text-sm font-medium">{selectedPlan?.serviceLimit} calls</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Total Amount</span>
                <span className="font-bold">{selectedPlan && formatPrice(selectedPlan.price)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="restaurant">Restaurant *</Label>
              <ClientOnly>
                <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ClientOnly>
              {restaurants.length === 0 && (
                <p className="text-sm text-destructive">
                  You need an approved restaurant to subscribe to AMC
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={minDateStr}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRenew"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="autoRenew" className="cursor-pointer">
                Auto-renew subscription when it expires
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscribeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubscribe} disabled={restaurants.length === 0}>
              Confirm Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
