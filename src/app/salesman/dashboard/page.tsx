"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase, CalendarClock, MapPin, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

interface Inquiry {
  id: string;
  name: string;
  businessName: string | null;
  status: string;
  followUpDate: string | null;
  createdAt: string;
}

interface Visit {
  id: string;
  companyName: string;
  visitDate: string;
  status: string;
}

export default function SalesmanDashboardPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const [inqRes, visitRes] = await Promise.all([
          fetch("/api/salesman/inquiries"),
          fetch("/api/salesman/visits"),
        ]);
        const inqData = await inqRes.json();
        const visitData = await visitRes.json();
        if (inqData.ok) setInquiries(inqData.data);
        if (visitData.ok) setVisits(visitData.data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const statusCounts = inquiries.reduce<Record<string, number>>((acc, inq) => {
    acc[inq.status] = (acc[inq.status] || 0) + 1;
    return acc;
  }, {});

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueToday = inquiries.filter((i) => i.followUpDate && new Date(i.followUpDate) <= new Date());
  const recentVisits = visits.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your assigned inquiries and recent activity</p>
        </div>
        <Button onClick={() => router.push("/salesman/inquiries/new")}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Inquiry
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Briefcase className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{inquiries.length}</p>
              <p className="text-xs text-muted-foreground">Total Inquiries</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CalendarClock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{dueToday.length}</p>
              <p className="text-xs text-muted-foreground">Follow-ups Due</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <MapPin className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{visits.length}</p>
              <p className="text-xs text-muted-foreground">Visits Logged</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Inquiries by Status</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(statusCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No inquiries assigned yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} variant="secondary" className="capitalize">
                  {status.replace(/_/g, " ").toLowerCase()}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Visits</CardTitle></CardHeader>
        <CardContent>
          {recentVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visits logged yet</p>
          ) : (
            <div className="space-y-2">
              {recentVisits.map((v) => (
                <div key={v.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">{v.companyName}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(v.visitDate)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{v.status.toLowerCase()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
