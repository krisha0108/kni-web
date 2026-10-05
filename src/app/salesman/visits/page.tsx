"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { CompanyPicker, CompanyPickerTrigger, type PickedCompany } from "@/components/salesman/company-picker";

interface Inquiry {
  id: string;
  name: string;
  businessName: string | null;
}

interface Visit {
  id: string;
  companyName: string;
  visitDate: string;
  status: string;
  discussion: string | null;
  followUpRequired: boolean;
  nextFollowUpDate: string | null;
  inquiry: { id: string; name: string; businessName: string | null } | null;
}

function SalesmanVisitsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedInquiryId = searchParams.get("inquiryId") || "";

  const [visits, setVisits] = useState<Visit[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [company, setCompany] = useState<PickedCompany | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    inquiryId: preselectedInquiryId,
    companyName: "",
    address: "",
    contactPerson: "",
    mobileNumber: "",
    email: "",
    visitDate: new Date().toISOString().slice(0, 16),
    purpose: "",
    discussion: "",
    followUpRequired: false,
    nextFollowUpDate: "",
  });

  const handleCompanySelected = (picked: PickedCompany) => {
    setCompany(picked);
    setFormData((f) => ({
      ...f,
      companyName: picked.name || f.companyName,
      address: picked.address || f.address,
      contactPerson: picked.contactName || f.contactPerson,
      mobileNumber: picked.phone || f.mobileNumber,
      email: picked.email || f.email,
    }));
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [visitsRes, inqRes] = await Promise.all([
        fetch("/api/salesman/visits"),
        fetch("/api/salesman/inquiries"),
      ]);
      const visitsData = await visitsRes.json();
      const inqData = await inqRes.json();
      if (visitsData.ok) setVisits(visitsData.data);
      if (inqData.ok) setInquiries(inqData.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/salesman/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          companyId: company?.id,
          inquiryId: formData.inquiryId || undefined,
          nextFollowUpDate: formData.nextFollowUpDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Visit logged" });
        setFormData({
          inquiryId: "", companyName: "", address: "", contactPerson: "", mobileNumber: "",
          email: "", visitDate: new Date().toISOString().slice(0, 16), purpose: "", discussion: "",
          followUpRequired: false, nextFollowUpDate: "",
        });
        setCompany(null);
        router.replace("/salesman/visits");
        fetchData();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Visits</h1>
        <p className="text-muted-foreground">Log daily customer visits and track follow-ups</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Log a Visit</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Related Inquiry (optional)</Label>
                <Select value={formData.inquiryId || "none"} onValueChange={(v) => setFormData({ ...formData, inquiryId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {inquiries.map((inq) => (
                      <SelectItem key={inq.id} value={inq.id}>{inq.businessName || inq.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <CompanyPickerTrigger selected={company} onOpen={() => setPickerOpen(true)} />
                <p className="text-xs text-muted-foreground">Selecting a company auto-fills the fields below — you can still edit them for this visit.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Visited <span className="text-destructive">*</span></Label>
                <Input id="companyName" required value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input id="contactPerson" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">Mobile</Label>
                  <Input id="mobileNumber" value={formData.mobileNumber} onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="visitDate">Visit Date/Time <span className="text-destructive">*</span></Label>
                <Input id="visitDate" type="datetime-local" required value={formData.visitDate} onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <Input id="purpose" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discussion">Discussion</Label>
                <Textarea id="discussion" rows={3} value={formData.discussion} onChange={(e) => setFormData({ ...formData, discussion: e.target.value })} />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label htmlFor="followUpRequired" className="cursor-pointer">Follow-up Required?</Label>
                <Switch id="followUpRequired" checked={formData.followUpRequired} onCheckedChange={(v) => setFormData({ ...formData, followUpRequired: v })} />
              </div>
              {formData.followUpRequired && (
                <div className="space-y-2">
                  <Label htmlFor="nextFollowUpDate">Next Follow-up Date</Label>
                  <Input id="nextFollowUpDate" type="date" value={formData.nextFollowUpDate} onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })} />
                </div>
              )}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
                Log Visit
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Your Visit History</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : visits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visits logged yet</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {visits.map((v) => (
                  <div key={v.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{v.companyName}</p>
                      <Badge variant="outline" className="text-xs capitalize">{v.status.toLowerCase()}</Badge>
                    </div>
                    {v.inquiry && (
                      <p className="text-xs text-muted-foreground">Linked to: {v.inquiry.businessName || v.inquiry.name}</p>
                    )}
                    {v.discussion && <p className="text-sm text-muted-foreground line-clamp-2">{v.discussion}</p>}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{formatDateTime(v.visitDate)}</span>
                      {v.followUpRequired && v.nextFollowUpDate && (
                        <span className="text-amber-600">Follow-up: {formatDateTime(v.nextFollowUpDate)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CompanyPicker open={pickerOpen} onOpenChange={setPickerOpen} onSelect={handleCompanySelected} />
    </div>
  );
}

export default function SalesmanVisitsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SalesmanVisitsInner />
    </Suspense>
  );
}
