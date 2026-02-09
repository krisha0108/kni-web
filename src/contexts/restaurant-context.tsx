"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Restaurant {
  restaurantId: string;
  role: string;
  restaurant: {
    id: string;
    name: string;
    city: string;
    pincode: string | null;
    address: string;
    restaurantImageUrl: string | null;
  };
}

interface RestaurantContextType {
  selectedRestaurant: Restaurant | null;
  restaurants: Restaurant[];
  selectRestaurant: (restaurant: Restaurant) => void;
  isLoading: boolean;
  refreshRestaurants: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch("/api/owner/restaurants/accessible");

      if (!response.ok) {
        console.error("Failed to fetch restaurants:", response.status, response.statusText);
        setIsLoading(false);
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Expected JSON response but got:", contentType);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log("Restaurant context: API response:", { ok: data.ok, count: data.data?.length });

      if (data.ok && data.data) {
        setRestaurants(data.data);

        // Load selected restaurant from localStorage (only on client)
        if (typeof window !== "undefined") {
          const savedId = localStorage.getItem("selectedRestaurantId");
          if (savedId) {
            const saved = data.data.find((r: Restaurant) => r.restaurantId === savedId);
            if (saved) {
              setSelectedRestaurant(saved);
              setIsLoading(false);
              return;
            }
          }

          // Auto-select first restaurant
          if (data.data.length > 0) {
            setSelectedRestaurant(data.data[0]);
            localStorage.setItem("selectedRestaurantId", data.data[0].restaurantId);
          }
        } else if (data.data.length > 0) {
          // Server-side: just select first restaurant without localStorage
          setSelectedRestaurant(data.data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch restaurants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const selectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedRestaurantId", restaurant.restaurantId);
    }
  };

  const refreshRestaurants = async () => {
    setIsLoading(true);
    await fetchRestaurants();
  };

  return (
    <RestaurantContext.Provider
      value={{ selectedRestaurant, restaurants, selectRestaurant, isLoading, refreshRestaurants }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error("useRestaurant must be used within RestaurantProvider");
  }
  return context;
}
