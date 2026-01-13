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
      const data = await response.json();

      if (data.ok) {
        setRestaurants(data.data);

        // Load selected restaurant from localStorage
        const savedId = localStorage.getItem("selectedRestaurantId");
        if (savedId) {
          const saved = data.data.find((r: Restaurant) => r.restaurantId === savedId);
          if (saved) {
            setSelectedRestaurant(saved);
            return;
          }
        }

        // Auto-select first restaurant
        if (data.data.length > 0) {
          setSelectedRestaurant(data.data[0]);
          localStorage.setItem("selectedRestaurantId", data.data[0].restaurantId);
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
    localStorage.setItem("selectedRestaurantId", restaurant.restaurantId);
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
