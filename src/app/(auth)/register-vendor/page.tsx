"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FolderOpen,
  Loader2,
  MapPin,
  Store,
  Mail,
  Phone,
  Lock,
  CheckCircle,
  ChevronRight,
  Eye,
  EyeOff,
  ShoppingBag,
  X,
} from "lucide-react";
import { ClientOnly } from "@/components/client-only";

interface MarketplaceCategory {
  id: string;
  name: string;
  imageUrl: string | null;
  _count: { products: number };
}

interface LocationOption {
  id: string;
  name: string;
}

export default function RegisterVendorPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    password: "",
    confirmPassword: "",
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Location state
  const [serviceStates, setServiceStates] = useState<LocationOption[]>([]);
  const [serviceCities, setServiceCities] = useState<LocationOption[]>([]);
  const [serviceAreas, setServiceAreas] = useState<LocationOption[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
    fetchServiceStates();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/public/marketplace-categories");
      const data = await response.json();
      if (data.ok) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchServiceStates = async () => {
    try {
      setIsLoadingLocations(true);
      const response = await fetch("/api/public/locations?type=states");
      const data = await response.json();
      if (data.ok) {
        setServiceStates(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch service states", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const fetchServiceCities = async (stateId: string) => {
    try {
      const response = await fetch(`/api/public/locations?type=cities&stateId=${stateId}`);
      const data = await response.json();
      if (data.ok) {
        setServiceCities(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch service cities", error);
    }
  };

  const fetchServiceAreas = async (cityId: string) => {
    try {
      const response = await fetch(`/api/public/locations?type=areas&cityId=${cityId}`);
      const data = await response.json();
      if (data.ok) {
        setServiceAreas(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch service areas", error);
    }
  };

  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedCityId("");
    setServiceCities([]);
    setServiceAreas([]);
    setSelectedAreaIds([]);
    // Set form state name from selected
    const st = serviceStates.find((s) => s.id === stateId);
    if (st) setFormData((prev) => ({ ...prev, state: st.name }));
    if (stateId) fetchServiceCities(stateId);
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    setServiceAreas([]);
    setSelectedAreaIds([]);
    // Set form city name from selected
    const ct = serviceCities.find((c) => c.id === cityId);
    if (ct) setFormData((prev) => ({ ...prev, city: ct.name }));
    if (cityId) fetchServiceAreas(cityId);
  };

  const toggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId]
    );
  };

  const removeArea = (areaId: string) => {
    setSelectedAreaIds((prev) => prev.filter((id) => id !== areaId));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCategories.length === 0) {
      toast({
        title: "Categories Required",
        description: "Please select at least one category you want to sell in.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStateId || !selectedCityId) {
      toast({
        title: "Location Required",
        description: "Please select your state and city.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          categoryIds: selectedCategories,
          areaIds: selectedAreaIds,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        toast({
          title: "Registration Failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Registration Successful",
        description: "Your account is pending approval.",
        variant: "success",
      });

      router.push(data.data.redirectUrl);
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get area names for selected chips
  const getAreaName = (areaId: string) => {
    return serviceAreas.find((a) => a.id === areaId)?.name || areaId;
  };

  return (
    <ClientOnly>
      <div data-wide className="w-full py-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Become a Vendor</h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Join our marketplace and start selling to thousands of restaurant owners
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">

              {/* Section 1: Business Details */}
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-muted/50 border-b">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                  <div>
                    <h3 className="font-semibold">Business Information</h3>
                    <p className="text-xs text-muted-foreground">Tell us about your business</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Business Name *</Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        name="name"
                        placeholder="Your Business Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="name@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          disabled={isLoading}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+91 9876543210"
                          value={formData.phone}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Service Location */}
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-muted/50 border-b">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                  <div>
                    <h3 className="font-semibold">Service Location</h3>
                    <p className="text-xs text-muted-foreground">Where do you want to operate?</p>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  {isLoadingLocations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : serviceStates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No service locations available yet</p>
                      <p className="text-sm mt-1">Please contact admin to set up locations.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>State *</Label>
                          <Select value={selectedStateId} onValueChange={handleStateChange} disabled={isLoading}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your state" />
                            </SelectTrigger>
                            <SelectContent>
                              {serviceStates.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>City *</Label>
                          <Select value={selectedCityId} onValueChange={handleCityChange} disabled={isLoading || !selectedStateId}>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedStateId ? "Select your city" : "Select state first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {serviceCities.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Areas Selection */}
                      {selectedCityId && serviceAreas.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Select Service Areas *</Label>
                            {selectedAreaIds.length > 0 && (
                              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                                {selectedAreaIds.length} selected
                              </span>
                            )}
                          </div>

                          {/* Selected areas chips */}
                          {selectedAreaIds.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {selectedAreaIds.map((id) => (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                                >
                                  <MapPin className="h-3 w-3" />
                                  {getAreaName(id)}
                                  <button
                                    type="button"
                                    onClick={() => removeArea(id)}
                                    className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {serviceAreas.map((area) => {
                              const isSelected = selectedAreaIds.includes(area.id);
                              return (
                                <label
                                  key={area.id}
                                  className={`
                                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                                    transition-all duration-150
                                    ${isSelected
                                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                                    }
                                  `}
                                >
                                  <div className={`
                                    flex items-center justify-center w-5 h-5 rounded border-2 transition-colors
                                    ${isSelected
                                      ? "bg-primary border-primary"
                                      : "border-muted-foreground/30"
                                    }
                                  `}>
                                    {isSelected && <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />}
                                  </div>
                                  <MapPin className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                  <span className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
                                    {area.name}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleArea(area.id)}
                                    className="sr-only"
                                  />
                                </label>
                              );
                            })}
                          </div>

                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Selected areas will be sent to admin for approval
                          </p>
                        </div>
                      )}

                      {selectedCityId && serviceAreas.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg bg-muted/30">
                          <MapPin className="mx-auto h-6 w-6 mb-2 opacity-40" />
                          No areas available for this city yet
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Section 3: Categories */}
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-muted/50 border-b">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Product Categories</h3>
                    <p className="text-xs text-muted-foreground">What do you want to sell?</p>
                  </div>
                  {selectedCategories.length > 0 && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {selectedCategories.length} selected
                    </span>
                  )}
                </div>
                <div className="p-6">
                  {isLoadingCategories ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No categories available yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {categories.map((category) => {
                        const isSelected = selectedCategories.includes(category.id);
                        return (
                          <label
                            key={category.id}
                            className={`
                              flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                              transition-all duration-150
                              ${isSelected
                                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                              }
                            `}
                          >
                            <div className={`
                              flex items-center justify-center w-5 h-5 rounded border-2 transition-colors
                              ${isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground/30"
                              }
                            `}>
                              {isSelected && <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />}
                            </div>
                            {category.imageUrl ? (
                              <img
                                src={category.imageUrl}
                                alt={category.name}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                <FolderOpen className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm ${isSelected ? "text-primary" : ""}`}>{category.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {category._count.products} products
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCategory(category.id)}
                              className="sr-only"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Password */}
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 bg-muted/50 border-b">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">4</div>
                  <div>
                    <h3 className="font-semibold">Set Password</h3>
                    <p className="text-xs text-muted-foreground">Create a secure password for your account</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          disabled={isLoading}
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          disabled={isLoading}
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min 8 characters with uppercase, lowercase, and a number
                  </p>
                </div>
              </div>

              {/* Submit */}
              <div className="space-y-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-base h-12"
                  disabled={isLoading || selectedCategories.length === 0 || !selectedStateId || !selectedCityId}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating your account...
                    </>
                  ) : (
                    <>
                      Create Vendor Account
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>

            </div>
          </form>
      </div>
    </ClientOnly>
  );
}
