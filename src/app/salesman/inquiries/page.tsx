"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Inquiry {
  id: string;
  name: string;
  businessName: string | null;
  phone: string;
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
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const qs = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
        const res = await fetch(`/api/salesman/inquiries${qs}`);
        const data = await res.json();
        if (data.ok) setInquiries(data.data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [statusFilter]);

  const filtered = inquiries.filter((inq) => {
    const q = search.toLowerCase();
    return !q || inq.name.toLowerCase().includes(q) || (inq.businessName || "").toLowerCase().includes(q) || inq.phone.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Inquiries</h1>
          <p className="text-muted-foreground">Inquiries assigned to you, from the website and your own entries</p>
        </div>
        <Button onClick={() => router.push("/salesman/inquiries/new")}>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No inquiries found</TableCell></TableRow>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
