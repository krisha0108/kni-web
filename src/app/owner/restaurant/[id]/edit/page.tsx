"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { ArrowLeft, Image, FileText, Loader2 } from "lucide-react";
import Link from "next/link";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  pincode: string | null;
  restaurantImageUrl: string | null;
  fssaiNumber: string | null;
  fssaiCertificateUrl: string | null;
  status: string;
}

export default function EditRestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    pincode: "",
    restaurantImageUrl: "",
    fssaiNumber: "",
    fssaiCertificateUrl: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const response = await fetch(`/api/owner/restaurants/${id}`);
        const data = await response.json();

        if (data.ok) {
          setRestaurant(data.data);
          setFormData({
            name: data.data.name || "",
            address: data.data.address || "",
            city: data.data.city || "",
            pincode: data.data.pincode || "",
            restaurantImageUrl: data.data.restaurantImageUrl || "",
            fssaiNumber: data.data.fssaiNumber || "",
            fssaiCertificateUrl: data.data.fssaiCertificateUrl || "",
          });
        } else {
          toast({ title: "Error", description: data.error, variant: "destructive" });
          router.push("/owner/restaurants");
        }
      } catch {
        toast({ title: "Error", description: "Failed to fetch restaurant", variant: "destructive" });
        router.push("/owner/restaurants");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurant();
  }, [id, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/owner/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Restaurant updated successfully" });
        router.push(`/owner/restaurant/${id}`);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update restaurant", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Button variant="ghost" asChild>
        <Link href={`/owner/restaurant/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Restaurant
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Restaurant</CardTitle>
          <CardDescription>Update your restaurant details</CardDescription>
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
                  disabled={isSaving}
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
                  disabled={isSaving}
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
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="400001"
                  maxLength={6}
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Restaurant Image */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Image className="h-5 w-5" />
                Restaurant Image
              </h3>
              <ImageUpload
                value={formData.restaurantImageUrl}
                onChange={(url) => setFormData({ ...formData, restaurantImageUrl: url })}
                folder="restaurants"
                label="Upload Restaurant Photo"
                disabled={isSaving}
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
                FSSAI Details
              </h3>
              <div className="space-y-2">
                <Label htmlFor="fssaiNumber">FSSAI License Number</Label>
                <Input
                  id="fssaiNumber"
                  value={formData.fssaiNumber}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/\D/g, "").slice(0, 14);
                    setFormData({ ...formData, fssaiNumber: value });
                  }}
                  placeholder="14 digit FSSAI number"
                  disabled={isSaving}
                  maxLength={14}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your 14-digit FSSAI license number
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fssaiCertificate">FSSAI Certificate</Label>
                <ImageUpload
                  value={formData.fssaiCertificateUrl}
                  onChange={(url) => setFormData({ ...formData, fssaiCertificateUrl: url })}
                  folder="fssai-certificates"
                  label="Upload FSSAI Certificate"
                  disabled={isSaving}
                  maxSizeMB={5}
                />
                <p className="text-sm text-muted-foreground">
                  Upload a clear photo or scan of your FSSAI license certificate
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/owner/restaurant/${id}`)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
