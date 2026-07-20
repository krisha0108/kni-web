"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { RefreshCw, Play, Clock, Megaphone } from "lucide-react";

interface PreviewItem {
  id: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface PreviewData {
  sponsoredToActivate: PreviewItem[];
  sponsoredToDeactivate: PreviewItem[];
}

interface RunResult {
  message: string;
  timestamp: string;
  actions: string[];
  summary: {
    sponsoredActivated: number;
    sponsoredDeactivated: number;
  };
}

export default function AutoSchedulePage() {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [showRunConfirm, setShowRunConfirm] = useState(false);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const { toast } = useToast();

  const fetchPreview = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/content/auto-schedule");
      const data = await response.json();
      if (data.ok) {
        setPreview(data.preview);
      } else {
        toast({ title: "Error", description: data.error || "Failed to load schedule preview", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to load schedule preview", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, []);

  const handleRunNow = async () => {
    setShowRunConfirm(false);
    setIsRunning(true);
    try {
      const response = await fetch("/api/admin/content/auto-schedule", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || "kni-cron-secret-2024"}`,
        },
      });
      const data = await response.json();
      if (data.ok) {
        setLastResult(data);
        toast({ title: "Success", description: `Auto-scheduling completed. ${data.actions.length} actions performed.` });
        fetchPreview();
      } else {
        toast({ title: "Error", description: data.error || "Failed to run auto-schedule", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to run auto-schedule", variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const totalPending = preview
    ? preview.sponsoredToActivate.length + preview.sponsoredToDeactivate.length
    : 0;

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Auto-Scheduling</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Preview and manage automated sponsored content publishing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPreview} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowRunConfirm(true)} disabled={isRunning || totalPending === 0}>
            <Play className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
            {isRunning ? "Running..." : "Run Now"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{preview?.sponsoredToActivate.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Campaigns to Activate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-red-600">{preview?.sponsoredToDeactivate.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Campaigns to Deactivate</p>
          </CardContent>
        </Card>
      </div>

      {/* Cron Info */}
      <Card className="mb-6 border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Automatic Schedule:</span>
            <span className="text-muted-foreground">Runs every hour via Vercel Cron</span>
          </div>
        </CardContent>
      </Card>

      {totalPending === 0 && !isLoading && (
        <Card className="mb-6">
          <CardContent className="pt-6 text-center text-muted-foreground py-12">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No pending actions</p>
            <p className="text-sm mt-1">All content is up to date. Next check runs automatically every hour.</p>
          </CardContent>
        </Card>
      )}

      {/* Sponsored to Activate */}
      {preview && preview.sponsoredToActivate.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-blue-600" />
              Campaigns to Activate ({preview.sponsoredToActivate.length})
            </CardTitle>
            <CardDescription>These campaigns have reached their start date</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.sponsoredToActivate.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.startDate ? formatDate(item.startDate) : "-"}</TableCell>
                    <TableCell>{item.endDate ? formatDate(item.endDate) : "-"}</TableCell>
                    <TableCell><Badge className="bg-blue-100 text-blue-800">Will Activate</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sponsored to Deactivate */}
      {preview && preview.sponsoredToDeactivate.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-red-600" />
              Campaigns to Deactivate ({preview.sponsoredToDeactivate.length})
            </CardTitle>
            <CardDescription>These campaigns have passed their end date</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.sponsoredToDeactivate.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.endDate ? formatDate(item.endDate) : "-"}</TableCell>
                    <TableCell><Badge className="bg-red-100 text-red-800">Will Deactivate</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Last Run Result */}
      {lastResult && (
        <Card className="mt-6 border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Last Run Result</CardTitle>
            <CardDescription>Ran at {formatDate(lastResult.timestamp)}</CardDescription>
          </CardHeader>
          <CardContent>
            {lastResult.actions.length > 0 ? (
              <ul className="space-y-1">
                {lastResult.actions.map((action, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="text-green-600">✓</span> {action}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No actions were needed.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Run Confirmation */}
      <AlertDialog open={showRunConfirm} onOpenChange={setShowRunConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Auto-Schedule Now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will process {totalPending} pending action{totalPending !== 1 ? "s" : ""}:
              {preview && (
                <ul className="mt-2 space-y-1 text-left">
                  {preview.sponsoredToActivate.length > 0 && <li>• Activate {preview.sponsoredToActivate.length} campaign(s)</li>}
                  {preview.sponsoredToDeactivate.length > 0 && <li>• Deactivate {preview.sponsoredToDeactivate.length} campaign(s)</li>}
                </ul>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRunNow}>Run Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
