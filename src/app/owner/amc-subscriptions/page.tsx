"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, Plus, Building2 } from "lucide-react";
import { useRestaurant } from "@/contexts/restaurant-context";
import {
  getAMCStatusColor,
  getAMCStatusLabel,
  getDaysRemaining,
  getUsageStatus,
  isExpiringSoon,
} from "@/lib/amc";
import { formatDate, formatPrice } from "@/lib/utils";
import { ExportButton } from "@/components/export-button";

interface AMCSubscription {
  id: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  servicesUsed: number;
  serviceLimit: number; // Now directly on subscription
  totalAmount: number;
  autoRenew: boolean;
  planName: string | null; // Custom plan name
  planDescription: string | null;
  duration: string;
  createdAt: string;
  plan?: {
    // Optional - only for template plans
    id: string;
    name: string;
    description: string | null;
    duration: string;
    price: number;
    serviceLimit: number;
  } | null;
  equipment?: {
    // Equipment-centric
    id: string;
    name: string;
    category: string;
  };
  restaurant: {
    id: string;
    name: string;
    city: string;
  };
}

export default function OwnerAMCSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AMCSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (selectedRestaurant) {
      fetchSubscriptions();
    }
  }, [selectedRestaurant, statusFilter]);

  const fetchSubscriptions = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("restaurantId", selectedRestaurant.restaurantId);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch("/api/owner/amc-subscriptions?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setSubscriptions(data.data.subscriptions || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch AMC subscriptions",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch AMC subscriptions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedRestaurant) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Please select a restaurant</p>
          <p className="text-sm text-muted-foreground mt-2">Use the restaurant switcher in the header to get started</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My AMC Subscriptions</h1>
          <p className="text-muted-foreground">Manage your Annual Maintenance Contract subscriptions for {selectedRestaurant.restaurant.name}</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            endpoint="/api/owner/exports/amc-subscriptions"
            filename={`amc-subscriptions-${new Date().toISOString().split('T')[0]}.csv`}
          />
          <Button onClick={() => router.push("/owner/amc-plans")}>
            <Plus className="mr-2 h-4 w-4" />
            Subscribe to Plan
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ClientOnly>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-muted-foreground mb-4">
              {statusFilter === "all"
                ? "You don't have any AMC subscriptions yet."
                : `No ${statusFilter.toLowerCase()} subscriptions found.`}
            </p>
            {statusFilter === "all" && (
              <Button onClick={() => router.push("/owner/amc-plans")}>
                Browse AMC Plans
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {subscriptions.map((sub) => {
            const usageStatus = getUsageStatus(sub.servicesUsed, sub.serviceLimit);
            const daysLeft = getDaysRemaining(sub.endDate);
            const expiringSoon = isExpiringSoon(sub.endDate);
            const displayName = sub.planName || sub.plan?.name || "Custom AMC Plan";

            return (
              <Card key={sub.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{displayName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {sub.equipment ? `${sub.equipment.name} - ${sub.restaurant.name}` : sub.restaurant.name}
                      </p>
                    </div>
                    <Badge variant={getAMCStatusColor(sub.status)}>
                      {getAMCStatusLabel(sub.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">{formatDate(sub.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p className="font-medium">{formatDate(sub.endDate)}</p>
                    </div>
                  </div>

                  {sub.status === "ACTIVE" && (
                    <div className="rounded-lg bg-muted p-3 space-y-2">
                      {expiringSoon && (
                        <div className="flex items-center gap-2 text-sm text-orange-600">
                          <span className="font-medium">⚠ Expires in {daysLeft} days</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Services Used</span>
                        <Badge variant={usageStatus.color} className="text-xs">
                          {usageStatus.label}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{sub.servicesUsed} used</span>
                          <span>{sub.serviceLimit} total</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              usageStatus.color === "destructive"
                                ? "bg-red-500"
                                : usageStatus.color === "warning"
                                ? "bg-orange-500"
                                : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                (sub.servicesUsed / sub.serviceLimit) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold">{formatPrice(sub.totalAmount)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/owner/amc-subscriptions/${sub.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>

                  {sub.autoRenew && sub.status === "ACTIVE" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">Auto-Renew Enabled</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
