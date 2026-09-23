"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface FormData {
  name: string;
  phone: string;
  region: string;
  isActive: boolean;
}

export default function EditSalesmanPage() {
  const params = useParams();
  const salesmanId = params.id as string;
  const [email, setEmail] = useState("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    region: "",
    isActive: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchSalesman();
  }, []);

  const fetchSalesman = async () => {
    try {
      const response = await fetch(`/api/admin/salesmen/${salesmanId}`);
      const data = await response.json();
      if (data.ok) {
        const s = data.data;
        setEmail(s.email);
        setFormData({
          name: s.name || "",
          phone: s.phone || "",
          region: s.salesmanProfile?.region || "",
          isActive: s.isActive,
        });
      } else {
        toast({ title: "Error", description: "Salesman not found", variant: "destructive" });
        router.push("/admin/salesmen");
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch salesman", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/salesmen/${salesmanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || undefined,
          region: formData.region || undefined,
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Salesman updated successfully" });
        router.push("/admin/salesmen");
      } else {
        toast({ title: "Error", description: data.error || "Failed to update salesman", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update salesman", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/salesmen")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Edit Salesman</h1>
          <p className="text-muted-foreground mt-1">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Salesman Information</CardTitle>
            <CardDescription>Update the salesman&apos;s details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91-9876543210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region / Territory</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="e.g. North Delhi, Gurugram"
                />
              </div>
            </div>

            {/* Status Toggle */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Account Status</h3>
                  <p className="text-sm text-muted-foreground">Enable or disable the salesman&apos;s login</p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="mr-2 h-4 w-4" />Save Changes</>)}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/salesmen")} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
