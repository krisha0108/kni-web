"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeft, Star, FileText, Award, UserCheck, Video, IndianRupee } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

interface Profile {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    isAvailable: boolean;
    createdAt: string;
    engineerProfile: { city: string | null; skills: string | null; payoutMethod: string; commissionRate: number; monthlySalary: number | null } | null;
  };
  candidate: {
    id: string;
    fullName: string;
    position: string;
    registrationId: string | null;
    rating: number | null;
    resumeUrl: string | null;
    videoIntroUrl: string | null;
    aadhaarUrl: string | null;
    panUrl: string | null;
    photoUrl: string | null;
    drivingLicenseUrl: string | null;
    salarySlipUrl: string | null;
    policeVerificationUrl: string | null;
    vaccinationCertUrl: string | null;
    experienceCertUrls: string[] | null;
    educationCertUrls: string[] | null;
    createdAt: string;
    trainingAttendances: { id: string; attended: boolean; certificateUrl: string | null; trainingProgram: { title: string; scheduledAt: string } }[];
    payments: { id: string; amount: number; status: string; verifiedAt: string | null }[];
  } | null;
  ratings: {
    id: string;
    overallRating: number;
    review: string | null;
    createdAt: string;
    owner: { name: string };
    restaurant: { name: string };
  }[];
  stats: {
    averageRating: number;
    totalRatings: number;
    averageProfessionalism: number | null;
    averageTechnicalSkill: number | null;
    averageCommunication: number | null;
    averagePunctuality: number | null;
    averageProblemSolving: number | null;
  } | null;
  assignments: {
    id: string;
    status: string;
    assignedAt: string;
    completedAt: string | null;
    commissionAmount: number | null;
    booking: { id: string; status: string; totalAmount: number | null; restaurant: { name: string } };
  }[];
}

const POSITION_LABELS: Record<string, string> = {
  TECHNICIAN_MECHANICAL: "Mechanical",
  TECHNICIAN_ELECTRICAL: "Electrical",
  TECHNICIAN_REFRIGERATION: "Refrigeration",
  TECHNICIAN_INDUCTION: "Induction",
  TECHNICIAN_COMMERCIAL_KITCHEN: "Commercial Kitchen",
};

export default function EngineerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/engineers/${id}/profile`);
      const data = await res.json();
      if (data.ok) setProfile(data.data);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading || !profile) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const { user, candidate, ratings, stats, assignments } = profile;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/engineers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            {user.name}
            <Badge variant={user.isActive ? "success" : "destructive"}>{user.isActive ? "Active" : "Inactive"}</Badge>
            <Badge variant={user.isAvailable ? "success" : "secondary"}>{user.isAvailable ? "Available for jobs" : "Unavailable"}</Badge>
          </h1>
          <p className="text-muted-foreground">{user.email} · {user.phone || "-"}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Engineer Profile</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">City:</span> {user.engineerProfile?.city || "-"}</p>
            <p><span className="text-muted-foreground">Skills:</span> {user.engineerProfile?.skills || "-"}</p>
            <p><span className="text-muted-foreground">Payout:</span> {user.engineerProfile?.payoutMethod === "SALARY" ? `Full-Time Employee (Salary Based) — ₹${user.engineerProfile.monthlySalary}/month` : `Associate Service Partner (Commission Based) — ${user.engineerProfile?.commissionRate}% commission`}</p>
            <p><span className="text-muted-foreground">Registered:</span> {formatDate(user.createdAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Ratings & Performance</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {stats && stats.totalRatings > 0 ? (
              <>
                <p className="flex items-center gap-1 text-lg font-semibold">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {stats.averageRating.toFixed(1)} / 5
                  <span className="text-sm font-normal text-muted-foreground">({stats.totalRatings} ratings)</span>
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                  {stats.averageProfessionalism != null && <p>Professionalism: {stats.averageProfessionalism.toFixed(1)}</p>}
                  {stats.averageTechnicalSkill != null && <p>Technical: {stats.averageTechnicalSkill.toFixed(1)}</p>}
                  {stats.averageCommunication != null && <p>Communication: {stats.averageCommunication.toFixed(1)}</p>}
                  {stats.averagePunctuality != null && <p>Punctuality: {stats.averagePunctuality.toFixed(1)}</p>}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No customer ratings yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {candidate && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserCheck className="h-4 w-4" /> Recruitment History</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <p><span className="text-muted-foreground">Position:</span> {POSITION_LABELS[candidate.position] || candidate.position}</p>
              <p><span className="text-muted-foreground">Registration ID:</span> {candidate.registrationId || "-"}</p>
              <p><span className="text-muted-foreground">Recruiter Rating:</span> {candidate.rating ? `${candidate.rating}/10` : "-"}</p>
              <p><span className="text-muted-foreground">Applied:</span> {formatDate(candidate.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: "Resume", url: candidate.resumeUrl },
                { label: "Aadhaar", url: candidate.aadhaarUrl },
                { label: "PAN", url: candidate.panUrl },
                { label: "Photo", url: candidate.photoUrl },
                { label: "Driving License", url: candidate.drivingLicenseUrl },
                { label: "Salary Slip", url: candidate.salarySlipUrl },
                { label: "Police Verification", url: candidate.policeVerificationUrl },
                { label: "Vaccination Certificate", url: candidate.vaccinationCertUrl },
              ]
                .filter((d) => d.url)
                .map((d) => (
                  <a key={d.label} href={d.url as string} target="_blank" rel="noreferrer">
                    <Badge variant="secondary" className="flex w-fit items-center gap-1"><FileText className="h-3 w-3" /> {d.label}</Badge>
                  </a>
                ))}
              {(candidate.experienceCertUrls || []).map((url, i) => (
                <a key={`exp-${i}`} href={url} target="_blank" rel="noreferrer">
                  <Badge variant="secondary" className="flex w-fit items-center gap-1"><FileText className="h-3 w-3" /> Experience Cert {i + 1}</Badge>
                </a>
              ))}
              {(candidate.educationCertUrls || []).map((url, i) => (
                <a key={`edu-${i}`} href={url} target="_blank" rel="noreferrer">
                  <Badge variant="secondary" className="flex w-fit items-center gap-1"><FileText className="h-3 w-3" /> Education Cert {i + 1}</Badge>
                </a>
              ))}
            </div>

            {candidate.videoIntroUrl && (
              <div className="pt-2">
                <p className="mb-1 flex items-center gap-1 font-medium"><Video className="h-3.5 w-3.5" /> Video Introduction</p>
                <video src={candidate.videoIntroUrl} controls className="w-full max-w-sm rounded-md border" />
              </div>
            )}

            {candidate.payments.length > 0 && (
              <div className="pt-2">
                <p className="mb-1 flex items-center gap-1 font-medium"><IndianRupee className="h-3.5 w-3.5" /> Payment Status</p>
                {candidate.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-t py-1 text-xs">
                    <span>₹{p.amount.toLocaleString("en-IN")}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant={p.status === "VERIFIED" ? "success" : p.status === "REJECTED" ? "destructive" : "secondary"}>{p.status}</Badge>
                      {p.verifiedAt && <span className="text-muted-foreground">{formatDate(p.verifiedAt)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {candidate.trainingAttendances.length > 0 && (
              <div className="pt-2">
                <p className="mb-1 font-medium">Training History</p>
                {candidate.trainingAttendances.map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-t py-1 text-xs">
                    <span>{t.trainingProgram.title} — {formatDateTime(t.trainingProgram.scheduledAt)}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant={t.attended ? "success" : "secondary"}>{t.attended ? "Attended" : "Not Attended"}</Badge>
                      {t.certificateUrl && (
                        <a href={t.certificateUrl} target="_blank" rel="noreferrer">
                          <Badge variant="outline" className="flex items-center gap-1"><Award className="h-3 w-3" /> Certificate</Badge>
                        </a>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Job Assignments</CardTitle></CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No job assignments yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.booking.restaurant.name}</TableCell>
                    <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    <TableCell>{a.commissionAmount ? `₹${a.commissionAmount.toLocaleString("en-IN")}` : "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(a.assignedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {ratings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ratings.map((r) => (
              <div key={r.id} className="border-b pb-2 text-sm last:border-b-0">
                <p className="flex items-center gap-1 font-medium">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> {r.overallRating}/5 — {r.restaurant.name}
                </p>
                {r.review && <p className="text-muted-foreground">{r.review}</p>}
                <p className="text-xs text-muted-foreground">{r.owner.name} · {formatDate(r.createdAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
