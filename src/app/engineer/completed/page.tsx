"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatPrice } from "@/lib/utils";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";

interface CompletedJob {
  id: string;
  status: string;
  assignedAt: string;
  completedAt: string;
  booking: {
    id: string;
    restaurant: {
      name: string;
      address: string;
    };
    slotStartDateTime: string | null;
    totalAmount: number;
  };
}

export default function EngineerCompletedPage() {
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const router = useRouter();

  const fetchCompletedJobs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/engineer/jobs?status=COMPLETED&page=${page}&pageSize=20`);
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setJobs(Array.isArray(items) ? items : []);
        setTotalPages(Math.ceil(total / 20) || 1);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch completed jobs", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedJobs();
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Completed Jobs</h1>
        <p className="text-muted-foreground">View your completed work history</p>
      </div>

      <div className="border rounded-lg">
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead>Location</TableHead>
              
              <TableHead>Service Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Completed On</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No completed jobs found
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    {job.booking?.restaurant?.name ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {job.booking?.restaurant?.address ?? "—"}
                  </TableCell>

                  <TableCell>{job.booking?.slotStartDateTime ? formatDate(job.booking.slotStartDateTime) : "—"}</TableCell>
                  <TableCell>{formatPrice(job.booking?.totalAmount ?? 0)}</TableCell>
                  <TableCell>{formatDate(job.completedAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/engineer/jobs/${job.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
                  
                
              
          
              
        
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4 p-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}

      {!isLoading && jobs.length === 0 && (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            You haven't completed any jobs yet
          </p>
          <Button onClick={() => router.push("/engineer/jobs")}>
            View Active Jobs
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{jobs.length}</div>
          <div className="text-sm text-muted-foreground">Total Completed</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">
            {jobs.length > 0 ? formatPrice(jobs.reduce((sum, job) => sum + (job.booking?.totalAmount ?? 0), 0)) : formatPrice(0)}
          </div>
          <div className="text-sm text-muted-foreground">Total Earnings</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">
            {jobs.length > 0 ? formatPrice(jobs.reduce((sum, job) => sum + (job.booking?.totalAmount ?? 0), 0) / jobs.length) : formatPrice(0)}
          </div>
          <div className="text-sm text-muted-foreground">Avg per Job</div>
        </div>
      </div>
    </div>
  );
}