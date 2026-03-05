"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  status: string;
}

interface RestaurantSelectorProps {
  value?: string;
  onChange: (restaurantId: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showOnlyApproved?: boolean;
}

export function RestaurantSelector({
  value,
  onChange,
  label = "Restaurant",
  required = true,
  disabled = false,
  showOnlyApproved = true,
}: RestaurantSelectorProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/owner/restaurants/accessible");
      const data = await response.json();

      if (data.ok) {
        let allRestaurants = (Array.isArray(data.data) ? data.data : []).map((item: any) => item.restaurant);

        // Filter to only approved if specified
        if (showOnlyApproved) {
          allRestaurants = allRestaurants.filter((r: Restaurant) => r.status === "APPROVED");
        }

        setRestaurants(allRestaurants);

        // Auto-select if only one restaurant
        if (allRestaurants.length === 1 && !value) {
          onChange(allRestaurants[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch restaurants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="restaurant">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
        <SelectTrigger id="restaurant">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={isLoading ? "Loading..." : "Select restaurant"} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {restaurants.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              {isLoading ? "Loading..." : "No restaurants available"}
            </div>
          ) : (
            restaurants.map((restaurant) => (
              <SelectItem key={restaurant.id} value={restaurant.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{restaurant.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {restaurant.city}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {restaurants.length === 0 && !isLoading && showOnlyApproved && (
        <p className="text-sm text-muted-foreground">
          No approved restaurants found. Please add and get approval for a restaurant first.
        </p>
      )}
    </div>
  );
}
