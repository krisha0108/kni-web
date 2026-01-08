"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function CreateRestaurantPage() {
  const [formData, setFormData] = useState({ name: "", address: "", city: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [existingRestaurant, setExistingRestaurant] = useState<{ id: string; status: string } | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkExisting = async () => {
      const response = await fetch("/api/owner/restaurants");
      const data = await response.json();
      if (data.ok && data.data) {
        setExistingRestaurant(data.data);
      }
    };
    checkExisting();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/owner/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Restaurant submitted for approval" });
        router.push("/owner/restaurant/status");
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create restaurant", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (existingRestaurant) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Restaurant Already Exists</CardTitle>
          <CardDescription>You already have a restaurant registered.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/owner/restaurant/status")}>
            View Status
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Register Restaurant</CardTitle>
        <CardDescription>Add your restaurant details for approval</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Restaurant Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Restaurant"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Mumbai"
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit for Approval"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
