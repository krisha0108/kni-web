"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface FormData {
  name: string;
  phone: string;
  city: string;
  skills: string;
  payoutMethod: string;
  commissionRate: string;
  monthlySalary: string;
  isActive: boolean;
}

export default function EditEngineerPage() {
  const params = useParams();
  const engineerId = params.id as string;
  const [email, setEmail] = useState("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    city: "",
    skills: "",
    payoutMethod: "COMMISSION",
    commissionRate: "20",
    monthlySalary: "",
    isActive: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchEngineer();
    fetch("/api/public/locations?type=states")
      .then((res) => res.json())
      .then((data) => { if (data.ok) setStates(data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedStateId) {
      fetch(`/api/public/locations?type=cities&stateId=${selectedStateId}`)
        .then((res) => res.json())
        .then((data) => { if (data.ok) setCities(data.data || []); })
        .catch(() => {});
    } else {
      setCities([]);
    }
  }, [selectedStateId]);

  const fetchEngineer = async () => {
    try {
      const response = await fetch(`/api/admin/engineers/${engineerId}`);
      const data = await response.json();
      if (data.ok) {
        const eng = data.data;
        setEmail(eng.email);
        setFormData({
          name: eng.name || "",
          phone: eng.phone || "",
          city: eng.engineerProfile?.city || "",
          skills: eng.engineerProfile?.skills || "",
          payoutMethod: eng.engineerProfile?.payoutMethod || "COMMISSION",
          commissionRate: String(eng.engineerProfile?.commissionRate ?? 20),
          monthlySalary: eng.engineerProfile?.monthlySalary ? String(eng.engineerProfile.monthlySalary) : "",
          isActive: eng.isActive,
        });

        // Hydrate state from city name for the dropdown
        if (eng.engineerProfile?.city) {
          try {
            const cityRes = await fetch(`/api/public/locations?type=city-lookup&cityName=${encodeURIComponent(eng.engineerProfile.city)}`);
            const cityData = await cityRes.json();
            if (cityData.ok && cityData.data?.stateId) {
              setSelectedStateId(cityData.data.stateId);
            }
          } catch {
            // City lookup failed, state dropdown won't be pre-selected
          }
        }
      } else {
        toast({ title: "Error", description: "Engineer not found", variant: "destructive" });
        router.push("/admin/engineers");
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch engineer", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/engineers/${engineerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || undefined,
          city: formData.city || undefined,
          skills: formData.skills || undefined,
          isActive: formData.isActive,
          payoutMethod: formData.payoutMethod,
          commissionRate: parseInt(formData.commissionRate) || 20,
          monthlySalary: formData.payoutMethod === "SALARY" && formData.monthlySalary ? parseInt(formData.monthlySalary) : undefined,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Engineer updated successfully" });
        router.push("/admin/engineers");
      } else {
        toast({ title: "Error", description: data.error || "Failed to update engineer", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update engineer", variant: "destructive" });
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
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/engineers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Edit Engineer</h1>
          <p className="text-muted-foreground mt-1">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Engineer Information</CardTitle>
            <CardDescription>Update the engineer's details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
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
                <Label>State</Label>
                <Select value={selectedStateId} onValueChange={(value) => { setSelectedStateId(value); setFormData({ ...formData, city: "" }); }}>
                  <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })} disabled={!selectedStateId}>
                  <SelectTrigger><SelectValue placeholder={selectedStateId ? "Select City" : "Select State first"} /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label htmlFor="skills">Skills & Expertise</Label>
              <Textarea
                id="skills"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="Kitchen Equipment, Refrigeration, HVAC, Plumbing, Electrical"
                rows={3}
              />
              <p className="text-sm text-muted-foreground">Enter comma-separated skills and areas of expertise</p>
            </div>

            {/* Payout Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Payout Configuration</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payout Method</Label>
                  <Select value={formData.payoutMethod} onValueChange={(value) => setFormData({ ...formData, payoutMethod: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMMISSION">Commission Based</SelectItem>
                      <SelectItem value="SALARY">Salary Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.payoutMethod === "COMMISSION" ? (
                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                    <Input
                      id="commissionRate"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">Percentage of job value earned as commission</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="monthlySalary">Monthly Salary (Rs)</Label>
                    <Input
                      id="monthlySalary"
                      type="number"
                      min="0"
                      value={formData.monthlySalary}
                      onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                      placeholder="30000"
                    />
                    <p className="text-sm text-muted-foreground">Fixed monthly salary in Rupees</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Toggle */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Account Status</h3>
                  <p className="text-sm text-muted-foreground">Enable or disable the engineer account</p>
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
              <Button type="button" variant="outline" onClick={() => router.push("/admin/engineers")} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
