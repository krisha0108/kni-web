"use client";

import { useRestaurant } from "@/contexts/restaurant-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

export function RestaurantSwitcher() {
  const { selectedRestaurant, restaurants, selectRestaurant, isLoading } = useRestaurant();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border rounded-md">
        <Building2 className="h-4 w-4" />
        <span>No approved restaurants</span>
      </div>
    );
  }

  return (
    <Select
      value={selectedRestaurant?.restaurantId}
      onValueChange={(id) => {
        const restaurant = restaurants.find((r) => r.restaurantId === id);
        if (restaurant) selectRestaurant(restaurant);
      }}
    >
      <SelectTrigger className="w-[140px] sm:w-[200px] lg:w-[240px] h-9">
        <div className="flex items-center gap-2 overflow-hidden">
          <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Select restaurant" className="truncate" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {restaurants.map((restaurant) => (
          <SelectItem key={restaurant.restaurantId} value={restaurant.restaurantId}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex flex-col">
                <span className="font-medium">{restaurant.restaurant.name}</span>
                <span className="text-xs text-muted-foreground">{restaurant.restaurant.city}</span>
              </div>
              <Badge variant="outline" className="ml-2 text-xs">
                {restaurant.role}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
