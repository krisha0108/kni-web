"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Search, Loader2, Eye, Star, Send, QrCode, Download } from "lucide-react";
import QRCode from "qrcode";
import { formatDate } from "@/lib/utils";
import { SKILLS_BY_POSITION, EQUIPMENT_LIST } from "@/app/apply/config";
import { Candidate, POSITION_LABELS, STATUS_LABELS, STATUS_COLORS } from "./_shared";

const ALL_SKILLS = Array.from(new Set(Object.values(SKILLS_BY_POSITION).flat())).sort();

export default function AdminRecruitmentPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPosition, setFilterPosition] = useState("ALL");
  const [filterSkill, setFilterSkill] = useState("ALL");
  const [filterEquipment, setFilterEquipment] = useState("ALL");
  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [maxExperience, setMaxExperience] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [filterDocuments, setFilterDocuments] = useState("ALL");
  const [filterVideo, setFilterVideo] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkChannel, setBulkChannel] = useState<"SMS" | "EMAIL">("EMAIL");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [applyUrl, setApplyUrl] = useState("/apply");

  useEffect(() => {
    setApplyUrl(`${window.location.origin}/apply`);
  }, []);

  // Auto-open the bulk-message dialog pre-seeded with one candidate when
  // arriving from the candidate detail page's "Message" button
  // (`/admin/recruitment?message=<id>`). Deliberately reads window.location
  // directly instead of useSearchParams() to avoid the Suspense-boundary
  // requirement that App Router imposes on that hook.
  useEffect(() => {
    const messageId = new URLSearchParams(window.location.search).get("message");
    if (messageId) {
      setCheckedIds([messageId]);
      setBulkOpen(true);
      router.replace("/admin/recruitment");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateQr = async () => {
    setQrOpen(true);
    setQrLoading(true);
    try {
      const dataUrl = await QRCode.toDataURL(applyUrl, { width: 512, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch {
      toast({ title: "Error", description: "Failed to generate QR code", variant: "destructive" });
    } finally {
      setQrLoading(false);
    }
  };

  const fetchCandidates = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterPosition !== "ALL") params.set("position", filterPosition);
      if (filterSkill !== "ALL") params.set("skill", filterSkill);
      if (filterEquipment !== "ALL") params.set("equipment", filterEquipment);
      if (filterCity) params.set("city", filterCity);
      if (filterState) params.set("state", filterState);
      if (minExperience) params.set("minExperience", minExperience);
      if (maxExperience) params.set("maxExperience", maxExperience);
      if (minSalary) params.set("minSalary", minSalary);
      if (maxSalary) params.set("maxSalary", maxSalary);
      if (filterDocuments !== "ALL") params.set("hasDocuments", filterDocuments);
      if (filterVideo !== "ALL") params.set("hasVideo", filterVideo);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", page.toString());
      params.set("pageSize", "20");
      const res = await fetch(`/api/admin/recruitment?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setCandidates(data.data.items);
        setTotalPages(data.data.totalPages);
        setStatusCounts(data.data.statusCounts);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch candidates", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [
    filterStatus,
    filterPosition,
    filterSkill,
    filterEquipment,
    filterCity,
    filterState,
    minExperience,
    maxExperience,
    minSalary,
    maxSalary,
    filterDocuments,
    filterVideo,
    searchQuery,
    page,
    toast,
  ]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleBulkSend = async () => {
    if (!bulkMessage.trim() || checkedIds.length === 0) return;
    setBulkSending(true);
    try {
      const res = await fetch("/api/admin/recruitment/bulk-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: checkedIds, channel: bulkChannel, message: bulkMessage }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: `${bulkChannel} sent`, description: `Sent to ${checkedIds.length} candidate(s)` });
        setBulkOpen(false);
        setBulkMessage("");
        setCheckedIds([]);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl lg:text-3xl">
            <UserCheck className="h-6 w-6" />
            Technician Recruitment
          </h1>
          <p className="text-muted-foreground">
            Manage technician applications from the QR-code registration form
          </p>
        </div>
        <Button variant="outline" onClick={handleGenerateQr}>
          <QrCode className="mr-2 h-4 w-4" /> Get QR Code
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, or email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={filterPosition} onValueChange={(v) => { setFilterPosition(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filter by position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Positions</SelectItem>
                {Object.entries(POSITION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <Select value={filterSkill} onValueChange={(v) => { setFilterSkill(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any Skill</SelectItem>
                {ALL_SKILLS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEquipment} onValueChange={(v) => { setFilterEquipment(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by equipment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any Equipment</SelectItem>
                {EQUIPMENT_LIST.map((eq) => (
                  <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="City"
              className="w-full md:w-[140px]"
              value={filterCity}
              onChange={(e) => { setFilterCity(e.target.value); setPage(1); }}
            />
            <Input
              placeholder="State"
              className="w-full md:w-[140px]"
              value={filterState}
              onChange={(e) => { setFilterState(e.target.value); setPage(1); }}
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min exp (yrs)"
                className="w-[110px]"
                value={minExperience}
                onChange={(e) => { setMinExperience(e.target.value); setPage(1); }}
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max exp (yrs)"
                className="w-[110px]"
                value={maxExperience}
                onChange={(e) => { setMaxExperience(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min salary"
                className="w-[110px]"
                value={minSalary}
                onChange={(e) => { setMinSalary(e.target.value); setPage(1); }}
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max salary"
                className="w-[110px]"
                value={maxSalary}
                onChange={(e) => { setMaxSalary(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={filterDocuments} onValueChange={(v) => { setFilterDocuments(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[170px]">
                <SelectValue placeholder="Documents?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Documents: Any</SelectItem>
                <SelectItem value="true">Documents: Uploaded</SelectItem>
                <SelectItem value="false">Documents: Missing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterVideo} onValueChange={(v) => { setFilterVideo(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[170px]">
                <SelectValue placeholder="Video?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Video: Any</SelectItem>
                <SelectItem value="true">Video: Uploaded</SelectItem>
                <SelectItem value="false">Video: Missing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}</span>
            {checkedIds.length > 0 && (
              <Button size="sm" onClick={() => setBulkOpen(true)}>
                <Send className="mr-2 h-4 w-4" /> Message {checkedIds.length} selected
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-slate-600">{statusCounts.NEW || 0}</p><p className="text-sm text-muted-foreground">New</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-yellow-600">{statusCounts.SHORTLISTED || 0}</p><p className="text-sm text-muted-foreground">Shortlisted</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-green-600">{statusCounts.APPROVED || 0}</p><p className="text-sm text-muted-foreground">Approved</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-green-700">{statusCounts.ACTIVE_TECHNICIAN || 0}</p><p className="text-sm text-muted-foreground">Active Technicians</p></CardContent></Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card><CardContent className="py-12 text-center"><Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" /><p className="text-muted-foreground">Loading...</p></CardContent></Card>
      ) : candidates.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><UserCheck className="mb-4 h-12 w-12 text-muted-foreground" /><p className="text-lg text-muted-foreground">No applications found</p></CardContent></Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead className="hidden md:table-cell">Position</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead className="hidden md:table-cell">Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Applied</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Checkbox
                      checked={checkedIds.includes(c.id)}
                      onCheckedChange={(v) =>
                        setCheckedIds((prev) => (v ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {c.fullName}
                    <span className="block text-xs text-muted-foreground">{c.mobile}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{POSITION_LABELS[c.position] || c.position}</TableCell>
                  <TableCell className="hidden lg:table-cell">{c.city}, {c.state}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.totalExperienceYears ?? "-"} yrs</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[c.status] || "default"}>{STATUS_LABELS[c.status] || c.status}</Badge>
                    {c.rating && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {c.rating}/10
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View"
                        onClick={() => router.push(`/admin/recruitment/${c.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Message"
                        onClick={() => { setCheckedIds([c.id]); setBulkOpen(true); }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bulk message dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {checkedIds.length === 1
                ? `Message ${candidates.find((c) => c.id === checkedIds[0])?.fullName || "candidate"}`
                : `Message ${checkedIds.length} candidates`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={bulkChannel} onValueChange={(v) => setBulkChannel(v as "SMS" | "EMAIL")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
              </SelectContent>
            </Select>
            <Textarea rows={4} value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} placeholder="Message..." />
          </div>
          <DialogFooter>
            <Button disabled={bulkSending || !bulkMessage.trim()} onClick={handleBulkSend}>
              {bulkSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR code dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Registration QR Code</DialogTitle>
            <DialogDescription>
              Print this on newspaper/social media ads — candidates scan it to open the application form.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrLoading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : qrDataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Registration QR Code" className="h-64 w-64 rounded border" />
                <p className="break-all text-center text-xs text-muted-foreground">{applyUrl}</p>
                <a href={qrDataUrl} download="kni-recruitment-qr.png" className="w-full">
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" /> Download PNG
                  </Button>
                </a>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
