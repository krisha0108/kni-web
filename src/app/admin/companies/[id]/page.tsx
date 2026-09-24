"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Building2, MapPin, Phone, Mail, Globe, FileText, Users } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  designation: string | null;
  phone: string | null;
  altPhone: string | null;
  email: string | null;
  isPrimary: boolean;
}

interface InquiryRow {
  id: string;
  name: string;
  status: string;
  priority: string;
  source: string;
  createdAt: string;
  assignedSalesman: { id: string; name: string } | null;
}

interface VisitRow {
  id: string;
  companyName: string;
  visitDate: string;
  status: string;
  discussion: string | null;
  salesman: { id: string; name: string };
}

interface CompanyDetail {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  gstNumber: string | null;
  website: string | null;
  createdAt: string;
  createdBySalesman: { id: string; name: string } | null;
  contacts: Contact[];
  inquiries: InquiryRow[];
  visits: VisitRow[];
}

export default function AdminCompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/companies/${id}`);
      const json = await res.json();
      if (json.ok) setCompany(json.data);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!company) {
    return <div className="text-center py-12 text-muted-foreground">Company not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/companies")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            {company.name}
          </h1>
          <p className="text-muted-foreground">
            {company.city || "No city set"}
            {company.createdBySalesman && <> &middot; Added by {company.createdBySalesman.name}</>}
            {" "}&middot; {formatDate(company.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Company Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {company.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /> {company.address}</p>}
              {company.gstNumber && <p className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground shrink-0" /> GST: {company.gstNumber}</p>}
              {company.website && <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground shrink-0" /> {company.website}</p>}
              {!company.address && !company.gstNumber && !company.website && (
                <p className="text-muted-foreground">No additional details on file</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Contacts</CardTitle></CardHeader>
            <CardContent>
              {company.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts on file</p>
              ) : (
                <div className="space-y-3">
                  {company.contacts.map((c) => (
                    <div key={c.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{c.name}</span>
                        {c.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                        {c.designation && <span className="text-xs text-muted-foreground">{c.designation}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
                        {c.altPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.altPhone} (alt)</span>}
                        {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Visits ({company.visits.length})</CardTitle></CardHeader>
            <CardContent>
              {company.visits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No visits logged for this company yet</p>
              ) : (
                <div className="space-y-3">
                  {company.visits.map((v) => (
                    <div key={v.id} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-medium">{v.salesman.name}</span>
                        <Badge variant="outline" className="text-xs capitalize">{v.status.toLowerCase()}</Badge>
                      </div>
                      {v.discussion && <p className="text-sm text-muted-foreground mt-1">{v.discussion}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{formatDateTime(v.visitDate)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Inquiries ({company.inquiries.length})</CardTitle></CardHeader>
            <CardContent>
              {company.inquiries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inquiries linked yet</p>
              ) : (
                <div className="space-y-3">
                  {company.inquiries.map((inq) => (
                    <button
                      key={inq.id}
                      type="button"
                      onClick={() => router.push(`/admin/launchpad/${inq.id}`)}
                      className="w-full text-left border-b pb-3 last:border-b-0 hover:bg-muted/50 -mx-1 px-1 rounded"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-medium">{inq.name}</span>
                        <Badge variant="secondary" className="text-xs capitalize">{inq.status.replace(/_/g, " ").toLowerCase()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {inq.assignedSalesman ? inq.assignedSalesman.name : "Unassigned"} &middot; {formatDate(inq.createdAt)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
