"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { ArrowLeft, Image, FileText } from "lucide-react";
import Link from "next/link";

export default function CreateRestaurantPage() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    restaurantImageUrl: "",
    fssaiNumber: "",
    fssaiCertificateUrl: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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
        router.push("/owner/restaurants");
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create restaurant", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Button variant="ghost" asChild>
        <Link href="/owner/restaurants">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Restaurants
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add New Restaurant</CardTitle>
          <CardDescription>Register a new restaurant location for approval</CardDescription>
        </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name *</Label>
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
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street, Downtown"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Mumbai"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Restaurant Image */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Image className="h-5 w-5" />
              Restaurant Image (Optional)
            </h3>
            <ImageUpload
              value={formData.restaurantImageUrl}
              onChange={(url) => setFormData({ ...formData, restaurantImageUrl: url })}
              folder="restaurants"
              label="Upload Restaurant Photo"
              disabled={isLoading}
              maxSizeMB={5}
            />
            <p className="text-sm text-muted-foreground">
              Upload a photo of your restaurant (front view, dining area, or logo)
            </p>
          </div>

          {/* FSSAI Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              FSSAI Details (Required)
            </h3>
            <div className="space-y-2">
              <Label htmlFor="fssaiNumber">FSSAI License Number *</Label>
              <Input
                id="fssaiNumber"
                value={formData.fssaiNumber}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/\D/g, '').slice(0, 14);
                  setFormData({ ...formData, fssaiNumber: value });
                }}
                placeholder="14 digit FSSAI number"
                required
                disabled={isLoading}
                maxLength={14}
              />
              <p className="text-sm text-muted-foreground">
                Enter your 14-digit FSSAI license number
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fssaiCertificate">FSSAI Certificate *</Label>
              <ImageUpload
                value={formData.fssaiCertificateUrl}
                onChange={(url) => setFormData({ ...formData, fssaiCertificateUrl: url })}
                folder="fssai-certificates"
                label="Upload FSSAI Certificate"
                disabled={isLoading}
                maxSizeMB={5}
              />
              <p className="text-sm text-muted-foreground">
                Upload a clear photo or scan of your FSSAI license certificate
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit for Approval"}
          </Button>
        </CardContent>
      </form>
    </Card>
    </div>
  );
}
