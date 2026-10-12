"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Plus, MapPin, CalendarClock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NewInquiryDialog } from "@/components/salesman/new-inquiry-dialog";
import { ScheduleVisitDialog, type ScheduleVisitTarget } from "@/components/salesman/schedule-visit-dialog";
import { FollowUpDialog, type FollowUpTarget } from "@/components/salesman/follow-up-dialog";

interface Inquiry {
  id: string;
  name: string;
  businessName: string | null;
  phone: string;
  email: string;
  city: string;
  status: string;
  priority: string;
  source: string;
  createdAt: string;
}

const STATUS_FILTERS = ["ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "ON_HOLD"];

export default function SalesmanInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isNewInquiryOpen, setIsNewInquiryOpen] = useState(false);
  const [visitTarget, setVisitTarget] = useState<ScheduleVisitTarget | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<FollowUpTarget | null>(null);
  const router = useRouter();

  const fetchInquiries = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/salesman/inquiries${qs}`);
      const data = await res.json();
      if (data.ok) setInquiries(data.data);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const filtered = inquiries.filter((inq) => {
    const q = search.toLowerCase();
    return !q || inq.name.toLowerCase().includes(q) || (inq.businessName || "").toLowerCase().includes(q) || inq.phone.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">All Inquiries</h1>
          <p className="text-muted-foreground">Inquiries assigned to you, from the website and your own entries</p>
        </div>
        <Button onClick={() => setIsNewInquiryOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Inquiry
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, business, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <Badge
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s === "ALL" ? "All" : s.replace(/_/g, " ").toLowerCase()}
            </Badge>
          ))}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Business</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No inquiries found</TableCell></TableRow>
              ) : (
                filtered.map((inq) => (
                  <TableRow
                    key={inq.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/salesman/inquiries/${inq.id}`)}
                  >
                    <TableCell className="font-medium text-xs sm:text-sm break-words">{inq.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm">{inq.businessName || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{inq.phone}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm">{inq.city}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">{inq.status.replace(/_/g, " ").toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm">{inq.source}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm">{formatDate(inq.createdAt)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Schedule Visit"
                          onClick={() =>
                            setVisitTarget({
                              inquiryId: inq.id,
                              companyName: inq.businessName || inq.name,
                              contactPerson: inq.name,
                              mobileNumber: inq.phone,
                              email: inq.email,
                            })
                          }
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Follow-up"
                          onClick={() =>
                            setFollowUpTarget({ inquiryId: inq.id, targetName: inq.businessName || inq.name })
                          }
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NewInquiryDialog
        open={isNewInquiryOpen}
        onOpenChange={setIsNewInquiryOpen}
        onCreated={() => fetchInquiries()}
      />
      <ScheduleVisitDialog
        target={visitTarget}
        onOpenChange={(open) => !open && setVisitTarget(null)}
      />
      <FollowUpDialog
        target={followUpTarget}
        onOpenChange={(open) => !open && setFollowUpTarget(null)}
      />
    </div>
  );
}
