"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { MapPin, X, Plus } from "lucide-react";

interface Coverage {
  id: string;
  coverageType: "CITY_WIDE" | "PINCODE_WISE";
  cities: string[];
  pincodes: string[];
}

export default function VendorCoveragePage() {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [coverageType, setCoverageType] = useState<"CITY_WIDE" | "PINCODE_WISE">("CITY_WIDE");
  const [cities, setCities] = useState<string[]>([]);
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [pincodeInput, setPincodeInput] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchCoverage();
  }, []);

  const fetchCoverage = async () => {
    try {
      const response = await fetch("/api/vendor/coverage");
      const data = await response.json();

      if (data.ok && data.data) {
        setCoverage(data.data);
        setCoverageType(data.data.coverageType);
        setCities((data.data.cities as string[]) || []);
        setPincodes((data.data.pincodes as string[]) || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch coverage settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCity = () => {
    if (!cityInput.trim()) return;
    if (cities.includes(cityInput.trim())) {
      toast({ title: "Error", description: "City already added", variant: "destructive" });
      return;
    }
    setCities([...cities, cityInput.trim()]);
    setCityInput("");
  };

  const handleRemoveCity = (city: string) => {
    setCities(cities.filter((c) => c !== city));
  };

  const handleAddPincode = () => {
    const pincode = pincodeInput.trim();
    if (!pincode) return;
    if (!/^\d{6}$/.test(pincode)) {
      toast({ title: "Error", description: "Pincode must be 6 digits", variant: "destructive" });
      return;
    }
    if (pincodes.includes(pincode)) {
      toast({ title: "Error", description: "Pincode already added", variant: "destructive" });
      return;
    }
    setPincodes([...pincodes, pincode]);
    setPincodeInput("");
  };

  const handleRemovePincode = (pincode: string) => {
    setPincodes(pincodes.filter((p) => p !== pincode));
  };

  const handleSave = async () => {
    if (coverageType === "CITY_WIDE" && cities.length === 0) {
      toast({ title: "Error", description: "Add at least one city", variant: "destructive" });
      return;
    }
    if (coverageType === "PINCODE_WISE" && pincodes.length === 0) {
      toast({ title: "Error", description: "Add at least one pincode", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/vendor/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverageType,
          cities: coverageType === "CITY_WIDE" ? cities : [],
          pincodes: coverageType === "PINCODE_WISE" ? pincodes : [],
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Coverage settings saved" });
        fetchCoverage();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save coverage", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Delivery Coverage</h1>
        <p className="text-muted-foreground">
          Set your delivery coverage area to control which restaurants can see your products
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coverage Type</CardTitle>
          <CardDescription>
            Choose how you want to define your delivery coverage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={coverageType} onValueChange={(v) => setCoverageType(v as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="CITY_WIDE" id="city" />
              <Label htmlFor="city" className="cursor-pointer">
                <div className="font-medium">City Wide</div>
                <div className="text-sm text-muted-foreground">
                  Deliver to entire cities (e.g., Mumbai, Pune)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="PINCODE_WISE" id="pincode" />
              <Label htmlFor="pincode" className="cursor-pointer">
                <div className="font-medium">Pincode Specific</div>
                <div className="text-sm text-muted-foreground">
                  Deliver to specific pincodes only
                </div>
              </Label>
            </div>
          </RadioGroup>

          {coverageType === "CITY_WIDE" && (
            <div className="space-y-4">
              <div>
                <Label>Cities</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Enter city name"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCity())}
                  />
                  <Button type="button" onClick={handleAddCity}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {cities.map((city) => (
                  <Badge key={city} variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {city}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveCity(city)}
                    />
                  </Badge>
                ))}
                {cities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No cities added yet</p>
                )}
              </div>
            </div>
          )}

          {coverageType === "PINCODE_WISE" && (
            <div className="space-y-4">
              <div>
                <Label>Pincodes</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Enter 6-digit pincode"
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPincode())}
                    maxLength={6}
                  />
                  <Button type="button" onClick={handleAddPincode}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {pincodes.map((pincode) => (
                  <Badge key={pincode} variant="secondary" className="gap-1">
                    {pincode}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemovePincode(pincode)}
                    />
                  </Badge>
                ))}
                {pincodes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No pincodes added yet</p>
                )}
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Coverage Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}