"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2, Plus, Phone, Mail, Globe, CalendarClock } from "lucide-react";
import { CompanyPicker } from "@/components/salesman/company-picker";
import { CompanyStatusDialog, type CompanyStatusTarget, type CompanyStatusValue } from "@/components/salesman/company-status-dialog";
import { FollowUpDialog, type FollowUpTarget } from "@/components/salesman/follow-up-dialog";

interface CompanyContact {
  id: string;
  name: string;
  designation: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
}

interface CompanyRow {
  id: string;
  name: string;
  city: string | null;
  website: string | null;
  status: CompanyStatusValue;
  contacts: CompanyContact[];
  _count: { inquiries: number; visits: number };
}

const STATUS_FILTERS: { value: CompanyStatusValue | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "NOT_PROGRESSING", label: "Not Progressing" },
  { value: "SUCCESS", label: "Success" },
];

const statusColors: Record<CompanyStatusValue, "warning" | "destructive" | "success"> = {
  IN_PROGRESS: "warning",
  NOT_PROGRESSING: "destructive",
  SUCCESS: "success",
};

export default function SalesmanCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CompanyStatusValue | "ALL">("ALL");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<CompanyStatusTarget | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<FollowUpTarget | null>(null);

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = statusFilter !== "ALL" ? `&status=${statusFilter}` : "";
      const res = await fetch(`/api/salesman/companies?all=true${qs}`);
      const data = await res.json();
      if (data.ok) setCompanies(data.data);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">All Companies</h1>
          <p className="text-muted-foreground">Every company in the shared master list, with its pipeline status</p>
        </div>
        <Button onClick={() => setPickerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Company
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Badge
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No companies found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => {
            const primary = c.contacts.find((ct) => ct.isPrimary) || c.contacts[0];
            return (
              <Card key={c.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      {c.city && <p className="text-xs text-muted-foreground">{c.city}</p>}
                    </div>
                    <Badge variant={statusColors[c.status]} className="shrink-0 capitalize">
                      {c.status.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </div>

                  {primary && (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{primary.name}{primary.designation ? ` · ${primary.designation}` : ""}</p>
                      {primary.phone && (
                        <p className="flex items-center gap-1.5 text-muted-foreground text-xs"><Phone className="h-3 w-3" /> {primary.phone}</p>
                      )}
                      {primary.email && (
                        <p className="flex items-center gap-1.5 text-muted-foreground text-xs"><Mail className="h-3 w-3" /> {primary.email}</p>
                      )}
                    </div>
                  )}

                  {c.website && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate"><Globe className="h-3 w-3 shrink-0" /> {c.website}</p>
                  )}

                  <p className="text-xs text-muted-foreground">{c._count.inquiries} inquiries · {c._count.visits} visits</p>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStatusTarget({ companyId: c.id, companyName: c.name, currentStatus: c.status })}
                    >
                      Update Status
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFollowUpTarget({ companyId: c.id, targetName: c.name })}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CompanyPicker open={pickerOpen} onOpenChange={setPickerOpen} onSelect={() => fetchCompanies()} />
      <CompanyStatusDialog
        target={statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        onUpdated={() => fetchCompanies()}
      />
      <FollowUpDialog
        target={followUpTarget}
        onOpenChange={(open) => !open && setFollowUpTarget(null)}
      />
    </div>
  );
}
