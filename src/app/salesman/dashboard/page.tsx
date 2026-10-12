"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, MapPin, Building2, CalendarClock, PlusCircle } from "lucide-react";
import { NewInquiryDialog } from "@/components/salesman/new-inquiry-dialog";

interface HomeCounts {
  inquiries: number;
  visits: number;
  companies: number;
  followUpsDue: number;
}

const EMPTY_COUNTS: HomeCounts = { inquiries: 0, visits: 0, companies: 0, followUpsDue: 0 };

export default function SalesmanDashboardPage() {
  const [counts, setCounts] = useState<HomeCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewInquiryOpen, setIsNewInquiryOpen] = useState(false);
  const router = useRouter();

  const fetchCounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const [inqRes, visitRes, companyRes, followUpRes] = await Promise.all([
        fetch("/api/salesman/inquiries"),
        fetch("/api/salesman/visits"),
        fetch("/api/salesman/companies?all=true"),
        fetch("/api/salesman/follow-ups"),
      ]);
      const [inqData, visitData, companyData, followUpData] = await Promise.all([
        inqRes.json(),
        visitRes.json(),
        companyRes.json(),
        followUpRes.json(),
      ]);

      const now = new Date();
      const followUpsDue = followUpData.ok
        ? followUpData.data.filter((f: { isDone: boolean; followUpDate: string }) => !f.isDone && new Date(f.followUpDate) <= now).length
        : 0;

      setCounts({
        inquiries: inqData.ok ? inqData.data.length : 0,
        visits: visitData.ok ? visitData.data.length : 0,
        companies: companyData.ok ? companyData.data.length : 0,
        followUpsDue,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const tiles = [
    { label: "All Inquiries", count: counts.inquiries, icon: ClipboardList, href: "/salesman/inquiries", color: "text-blue-600" },
    { label: "Visits", count: counts.visits, icon: MapPin, href: "/salesman/visits", color: "text-primary" },
    { label: "All Companies", count: counts.companies, icon: Building2, href: "/salesman/companies", color: "text-purple-600" },
    { label: "Follow-ups", count: counts.followUpsDue, countLabel: "due", icon: CalendarClock, href: "/salesman/follow-ups", color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Everything you need for the day, in one place</p>
        </div>
        <Button onClick={() => setIsNewInquiryOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Inquiry
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card
              key={tile.label}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(tile.href)}
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted shrink-0">
                  <Icon className={`h-6 w-6 ${tile.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {tile.count}
                    {tile.countLabel && <span className="text-sm font-normal text-muted-foreground ml-1">{tile.countLabel}</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{tile.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <NewInquiryDialog
        open={isNewInquiryOpen}
        onOpenChange={setIsNewInquiryOpen}
        onCreated={() => fetchCounts()}
      />
    </div>
  );
}
