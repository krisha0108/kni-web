"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Phone, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface JobApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string | null;
  message: string | null;
  status: "NEW" | "REVIEWED" | "CONTACTED";
  createdAt: string;
  jobPosition: { id: string; title: string };
}

const statusColors: Record<string, "default" | "success" | "secondary"> = {
  NEW: "secondary",
  REVIEWED: "default",
  CONTACTED: "success",
};

export default function AdminJobApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/job-applications");
      const data = await response.json();
      if (data.ok) setApplications(data.data);
    } catch {
      toast({ title: "Error", description: "Failed to fetch job applications", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const previous = applications;
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: status as JobApplication["status"] } : a)));
    try {
      const response = await fetch(`/api/admin/job-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
    } catch {
      setApplications(previous);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const filtered = applications.filter((a) => {
    const q = search.toLowerCase();
    return (
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.phone.includes(q) ||
      a.jobPosition.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Job Applications</h1>
        <p className="text-muted-foreground">
          Submissions from the Careers page (positions other than Service Technician)
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search name, email, phone, position..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="hidden lg:table-cell">Message</TableHead>
                <TableHead>Resume</TableHead>
                <TableHead className="hidden md:table-cell">Received</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No applications yet</TableCell></TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id} className={a.status === "NEW" ? "bg-blue-50/50" : ""}>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {a.name}
                      {a.status === "NEW" && <Badge variant="secondary" className="ml-2 text-xs">New</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm break-all">
                      <a href={`mailto:${a.email}`} className="text-blue-600 hover:underline">{a.email}</a>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                      <a href={`tel:${a.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Phone className="h-3 w-3" /> {a.phone}
                      </a>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">{a.jobPosition.title}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs sm:text-sm max-w-[260px]">
                      {a.message ? <p className="text-muted-foreground truncate">{a.message}</p> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {a.resumeUrl ? (
                        <a href={a.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs sm:text-sm">
                          <FileText className="h-3 w-3" /> View
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm">{formatDateTime(a.createdAt)}</TableCell>
                    <TableCell>
                      <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue>
                            <Badge variant={statusColors[a.status]} className="text-xs">{a.status}</Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">New</SelectItem>
                          <SelectItem value="REVIEWED">Reviewed</SelectItem>
                          <SelectItem value="CONTACTED">Contacted</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
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
