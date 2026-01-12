"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, MapPin, Clock, CheckCircle, XCircle } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  restaurantImageUrl: string | null;
  fssaiNumber: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/owner/restaurants");
      const data = await response.json();

      if (data.ok) {
        setRestaurants(Array.isArray(data.data) ? data.data : []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch restaurants",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch restaurants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const getStatusConfig = (status: string) => {
    const configs = {
      PENDING: {
        icon: Clock,
        variant: "warning" as const,
        label: "Pending Approval",
        color: "text-yellow-600",
      },
      APPROVED: {
        icon: CheckCircle,
        variant: "success" as const,
        label: "Approved",
        color: "text-green-600",
      },
      REJECTED: {
        icon: XCircle,
        variant: "destructive" as const,
        label: "Rejected",
        color: "text-red-600",
      },
    };
    return configs[status as keyof typeof configs] || configs.PENDING;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading restaurants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Restaurants</h1>
          <p className="text-muted-foreground">
            Manage all your restaurant locations
          </p>
        </div>
        <Button onClick={() => router.push("/owner/restaurant/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Restaurant
        </Button>
      </div>

      {restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Restaurants Yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first restaurant
            </p>
            <Button onClick={() => router.push("/owner/restaurant/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Restaurant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => {
            const statusConfig = getStatusConfig(restaurant.status);
            const StatusIcon = statusConfig.icon;

            return (
              <Card
                key={restaurant.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => router.push(`/owner/restaurant/${restaurant.id}`)}
              >
                {restaurant.restaurantImageUrl && (
                  <div className="relative h-40 w-full overflow-hidden">
                    <img
                      src={restaurant.restaurantImageUrl}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant={statusConfig.variant}>
                        {restaurant.status}
                      </Badge>
                    </div>
                  </div>
                )}
                <CardHeader className={restaurant.restaurantImageUrl ? "pt-4" : ""}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                    </div>
                    {!restaurant.restaurantImageUrl && (
                      <Badge variant={statusConfig.variant}>
                        {restaurant.status}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-start gap-2 mt-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {restaurant.address}, {restaurant.city}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                      <span className="text-muted-foreground">
                        {statusConfig.label}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatDate(restaurant.createdAt)}
                    </span>
                  </div>
                  {restaurant.fssaiNumber && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      FSSAI: {restaurant.fssaiNumber}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Card */}
      {restaurants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {restaurants.length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {restaurants.filter((r) => r.status === "APPROVED").length}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {restaurants.filter((r) => r.status === "PENDING").length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
