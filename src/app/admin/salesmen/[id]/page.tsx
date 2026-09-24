"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Briefcase, CalendarClock, ClipboardList, MapPin } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

interface TimelineEntry {
  kind: "visit" | "activity";
  id: string;
  date: string;
  title: string;
  description: string | null;
  status: string | null;
  inquiryId: string | null;
  inquiryName?: string;
  followUpRequired: boolean;
  nextFollowUpDate: string | null;
}

interface ActivityData {
  salesman: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    createdAt: string;
    salesmanProfile: { region: string | null } | null;
  };
  stats: { totalInquiries: number; totalVisits: number; pendingFollowUps: number };
  inquiries: { id: string; name: string; businessName: string | null; status: string }[];
  timeline: TimelineEntry[];
}

export default function SalesmanActivityPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [inquiryFilter, setInquiryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchActivity = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (range !== "all") qs.set("range", range);
      if (range === "custom") {
        if (from) qs.set("from", from);
        if (to) qs.set("to", to);
      }
      if (inquiryFilter !== "all") qs.set("inquiryId", inquiryFilter);
      if (typeFilter !== "all") qs.set("type", typeFilter);

      const res = await fetch(`/api/admin/salesmen/${id}/activity?${qs.toString()}`);
      const json = await res.json();
      if (json.ok) setData(json.data);
    } finally {
      setIsLoading(false);
    }
  }, [id, range, from, to, inquiryFilter, typeFilter]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  if (isLoading && !data) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">Salesman not found</div>;
  }

  const { salesman, stats, inquiries, timeline } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/salesmen")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            {salesman.name}
            <Badge variant={salesman.isActive ? "success" : "destructive"}>
              {salesman.isActive ? "Active" : "Inactive"}
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            {salesman.email} · {salesman.phone || "-"}
            {salesman.salesmanProfile?.region && <> · {salesman.salesmanProfile.region}</>}
          </p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Briefcase className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.totalInquiries}</p>
              <p className="text-xs text-muted-foreground">Inquiries Handled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <MapPin className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.totalVisits}</p>
              <p className="text-xs text-muted-foreground">Visits Logged</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CalendarClock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{stats.pendingFollowUps}</p>
              <p className="text-xs text-muted-foreground">Pending Follow-ups</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-base">Activity History</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="space-y-1 w-full sm:w-auto">
              <p className="text-xs text-muted-foreground">Date range</p>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {range === "custom" && (
              <>
                <div className="space-y-1 w-full sm:w-auto">
                  <p className="text-xs text-muted-foreground">From</p>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-[160px]" />
                </div>
                <div className="space-y-1 w-full sm:w-auto">
                  <p className="text-xs text-muted-foreground">To</p>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-[160px]" />
                </div>
              </>
            )}

            <div className="space-y-1 w-full sm:w-auto">
              <p className="text-xs text-muted-foreground">Inquiry</p>
              <Select value={inquiryFilter} onValueChange={setInquiryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All inquiries</SelectItem>
                  {inquiries.map((inq) => (
                    <SelectItem key={inq.id} value={inq.id}>{inq.businessName || inq.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 w-full sm:w-auto">
              <p className="text-xs text-muted-foreground">Type</p>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visits + Tasks</SelectItem>
                  <SelectItem value="visit">Visits only</SelectItem>
                  <SelectItem value="activity">Tasks only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center flex items-center justify-center gap-2">
              <ClipboardList className="h-4 w-4" /> No activity found for this filter
            </p>
          ) : (
            <div className="space-y-3">
              {timeline.map((entry) => (
                <div key={`${entry.kind}-${entry.id}`} className="flex items-start gap-3 border-b pb-3 last:border-b-0">
                  <Badge variant={entry.kind === "visit" ? "default" : "outline"} className="mt-0.5 shrink-0 capitalize">
                    {entry.kind}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{entry.title}</p>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{formatDateTime(entry.date)}</span>
                      {entry.status && <Badge variant="secondary" className="text-xs">{entry.status}</Badge>}
                      {entry.followUpRequired && entry.nextFollowUpDate && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <CalendarClock className="h-3 w-3" /> Follow-up: {formatDate(entry.nextFollowUpDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
