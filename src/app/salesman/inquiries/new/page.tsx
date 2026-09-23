"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface FormData {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  businessName: string;
  businessType: string;
  budgetRange: string;
  areaInSqFt: string;
  timeline: string;
  message: string;
  servicesNeeded: string;
  source: string;
}

const BUSINESS_TYPES = ["RESTAURANT", "CAFE", "CLOUD_KITCHEN", "QSR", "BAKERY", "CATERING", "OTHER"];
const SOURCES = ["WhatsApp", "Phone", "Reference", "Other"];

const BUDGET_RANGES = [
  { value: "UNDER_5L", label: "Under 5 Lakhs" },
  { value: "L5_TO_10L", label: "5 - 10 Lakhs" },
  { value: "L10_TO_25L", label: "10 - 25 Lakhs" },
  { value: "L25_TO_50L", label: "25 - 50 Lakhs" },
  { value: "L50_TO_1CR", label: "50 Lakhs - 1 Crore" },
  { value: "ABOVE_1CR", label: "Above 1 Crore" },
];

const TIMELINES = [
  { value: "IMMEDIATELY", label: "Immediately" },
  { value: "WITHIN_1_MONTH", label: "Within 1 Month" },
  { value: "WITHIN_3_MONTHS", label: "Within 3 Months" },
  { value: "WITHIN_6_MONTHS", label: "Within 6 Months" },
  { value: "WITHIN_1_YEAR", label: "Within 1 Year" },
  { value: "JUST_EXPLORING", label: "Just Exploring" },
];

export default function NewSalesmanInquiryPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "", email: "", phone: "", city: "", address: "",
    businessName: "", businessType: "RESTAURANT", budgetRange: "",
    areaInSqFt: "", timeline: "", message: "",
    servicesNeeded: "", source: "WhatsApp",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/salesman/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          budgetRange: formData.budgetRange || undefined,
          areaInSqFt: formData.areaInSqFt ? parseInt(formData.areaInSqFt, 10) : undefined,
          timeline: formData.timeline || undefined,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Inquiry created and assigned to you" });
        router.push(`/salesman/inquiries/${data.data.id}`);
      } else {
        toast({ title: "Error", description: data.error || "Failed to create inquiry", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create inquiry", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/salesman/inquiries")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">New Inquiry</h1>
          <p className="text-muted-foreground mt-1">Log a lead you picked up via call, WhatsApp, or reference</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Customer / Company Details</CardTitle>
            <CardDescription>This will be assigned to you and tracked in the CRM</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Contact Name <span className="text-destructive">*</span></Label>
                <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
                <Input id="phone" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input id="businessName" value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                <Input id="city" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Select value={formData.businessType} onValueChange={(v) => setFormData({ ...formData, businessType: v })}>
                  <SelectTrigger id="businessType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ").toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">How did you get this lead? <span className="text-destructive">*</span></Label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger id="source"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetRange">Budget Range</Label>
                <Select value={formData.budgetRange || "none"} onValueChange={(v) => setFormData({ ...formData, budgetRange: v === "none" ? "" : v })}>
                  <SelectTrigger id="budgetRange"><SelectValue placeholder="Select budget range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {BUDGET_RANGES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="areaInSqFt">Kitchen Area (sq ft)</Label>
                <Input
                  id="areaInSqFt"
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  value={formData.areaInSqFt}
                  onChange={(e) => setFormData({ ...formData, areaInSqFt: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="timeline">When do they plan to start?</Label>
                <Select value={formData.timeline || "none"} onValueChange={(v) => setFormData({ ...formData, timeline: v === "none" ? "" : v })}>
                  <SelectTrigger id="timeline"><SelectValue placeholder="Select timeline" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {TIMELINES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="servicesNeeded">Services Needed</Label>
              <Input id="servicesNeeded" placeholder="e.g. AMC, Marketplace equipment, Repair" value={formData.servicesNeeded} onChange={(e) => setFormData({ ...formData, servicesNeeded: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Requirement / Notes</Label>
              <Textarea id="message" rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="mr-2 h-4 w-4" />Create Inquiry</>)}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/salesman/inquiries")} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
