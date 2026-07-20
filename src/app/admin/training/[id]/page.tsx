"use client";

import { useState, useEffect, useCallback, use as usePromise } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, Plus, Award, Search, FileText, Upload } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Attendance {
  id: string;
  attended: boolean;
  certificateUrl: string | null;
  candidate: { id: string; fullName: string; mobile: string; position: string } | null;
  engineerUser: { id: string; name: string; phone: string | null; email: string } | null;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  type: "TRAINING" | "SEMINAR";
  scheduledAt: string;
  seatLimit: number | null;
  materialUrls: string[] | null;
  attendances: Attendance[];
}

interface CandidateOption {
  id: string;
  fullName: string;
  mobile: string;
  status: string;
}

export default function TrainingProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);
  const { toast } = useToast();
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [uploadingCertFor, setUploadingCertFor] = useState<string | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  const fetchProgram = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/training-programs/${id}`);
      const data = await res.json();
      if (data.ok) setProgram(data.data);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const searchCandidates = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", "TRAINING_PENDING");
    if (searchQuery) params.set("search", searchQuery);
    const res = await fetch(`/api/admin/recruitment?${params.toString()}`);
    const data = await res.json();
    if (data.ok) setCandidates(data.data.items);
  }, [searchQuery]);

  useEffect(() => {
    if (enrollOpen) searchCandidates();
  }, [enrollOpen, searchCandidates]);

  const handleEnroll = async (candidateId: string) => {
    setEnrolling(candidateId);
    try {
      const res = await fetch(`/api/admin/training-programs/${id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Enrolled successfully" });
        fetchProgram();
        searchCandidates();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } finally {
      setEnrolling(null);
    }
  };

  const handleToggleAttended = async (attendanceId: string, attended: boolean) => {
    const res = await fetch(`/api/admin/training-programs/${id}/attendance/${attendanceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attended }),
    });
    const data = await res.json();
    if (data.ok) {
      toast({ title: attended ? "Marked attended" : "Marked absent" });
      fetchProgram();
    } else {
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const handleUploadCertificate = async (attendanceId: string, file: File) => {
    setUploadingCertFor(attendanceId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "training-certificates");
      const uploadRes = await fetch("/api/upload-document", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.ok) throw new Error(uploadData.error);

      const res = await fetch(`/api/admin/training-programs/${id}/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateUrl: uploadData.url }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Certificate issued" });
        fetchProgram();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setUploadingCertFor(null);
    }
  };

  const handleUploadMaterial = async (file: File) => {
    setUploadingMaterial(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "training-materials");
      const uploadRes = await fetch("/api/upload-document", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.ok) throw new Error(uploadData.error);

      const res = await fetch(`/api/admin/training-programs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialUrl: uploadData.url }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Material uploaded" });
        fetchProgram();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setUploadingMaterial(false);
    }
  };

  if (isLoading || !program) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <GraduationCap className="h-6 w-6" /> {program.title}
          <Badge variant={program.type === "SEMINAR" ? "secondary" : "default"}>{program.type}</Badge>
        </h1>
        <p className="text-muted-foreground">{formatDateTime(program.scheduledAt)}</p>
        {program.description && <p className="mt-2 text-sm">{program.description}</p>}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Training Material</CardTitle>
          <label>
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadMaterial(file);
              }}
            />
            <Button asChild size="sm" variant="outline" disabled={uploadingMaterial}>
              <span>
                {uploadingMaterial ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Material
              </span>
            </Button>
          </label>
        </CardHeader>
        <CardContent>
          {!program.materialUrls || program.materialUrls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No material uploaded yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {program.materialUrls.map((url, i) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    <FileText className="h-3 w-3" /> Material {i + 1}
                  </Badge>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Enrolled ({program.attendances.length}{program.seatLimit ? ` / ${program.seatLimit}` : ""})
          </CardTitle>
          <Button size="sm" onClick={() => setEnrollOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Enroll Candidate
          </Button>
        </CardHeader>
        <CardContent>
          {program.attendances.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No one enrolled yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Attended</TableHead>
                  <TableHead>Certificate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {program.attendances.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.candidate?.fullName || a.engineerUser?.name}
                      {a.candidate && <span className="block text-xs text-muted-foreground">Candidate</span>}
                      {a.engineerUser && <span className="block text-xs text-muted-foreground">Engineer</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.candidate?.mobile || a.engineerUser?.phone || a.engineerUser?.email}
                    </TableCell>
                    <TableCell>
                      <Checkbox checked={a.attended} onCheckedChange={(v) => handleToggleAttended(a.id, Boolean(v))} />
                    </TableCell>
                    <TableCell>
                      {a.certificateUrl ? (
                        <a href={a.certificateUrl} target="_blank" rel="noreferrer">
                          <Badge variant="success" className="flex w-fit items-center gap-1"><Award className="h-3 w-3" /> Issued</Badge>
                        </a>
                      ) : (
                        <label>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadCertificate(a.id, file);
                            }}
                          />
                          <Button asChild variant="outline" size="sm" disabled={uploadingCertFor === a.id}>
                            <span>
                              {uploadingCertFor === a.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                              Issue Certificate
                            </span>
                          </Button>
                        </label>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Enroll a Candidate (Training Pending)</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by name or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No candidates awaiting training</p>
            ) : (
              candidates.map((c) => {
                const alreadyEnrolled = program.attendances.some((a) => a.candidate?.id === c.id);
                return (
                  <div key={c.id} className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="text-sm font-medium">{c.fullName}</p>
                      <p className="text-xs text-muted-foreground">{c.mobile}</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={alreadyEnrolled || enrolling === c.id}
                      onClick={() => handleEnroll(c.id)}
                    >
                      {enrolling === c.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {alreadyEnrolled ? "Enrolled" : "Enroll"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>
    </div>
  );
}
