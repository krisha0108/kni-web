"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BackupDownloadButton } from "@/components/admin/backup-download-button";
import { Database, Archive, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface BackupTableInfo {
  key: string;
  label: string;
  rowCount: number;
}

interface BackupModuleInfo {
  key: string;
  label: string;
  description: string;
  tables: BackupTableInfo[];
}

interface BackupLogEntry {
  id: string;
  module: string;
  format: string;
  tableKey: string | null;
  status: string;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  generatedBy: { name: string; email: string } | null;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminBackupManagementPage() {
  const [modules, setModules] = useState<BackupModuleInfo[]>([]);
  const [history, setHistory] = useState<BackupLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    loadBackupData(controller.signal);
    return () => controller.abort();
  }, []);

  const loadBackupData = async (signal: AbortSignal) => {
    try {
      const [modulesRes, historyRes] = await Promise.all([
        fetch("/api/admin/backup/modules", { signal }),
        fetch("/api/admin/backup/history", { signal }),
      ]);
      const [modulesJson, historyJson] = await Promise.all([modulesRes.json(), historyRes.json()]);
      if (modulesJson.ok) setModules(modulesJson.data);
      if (historyJson.ok) setHistory(historyJson.data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Failed to load backup data", error);
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  };

  const refreshHistory = async () => {
    try {
      const res = await fetch("/api/admin/backup/history");
      const json = await res.json();
      if (json.ok) setHistory(json.data);
    } catch (error) {
      console.error("Failed to refresh backup history", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backup Management</h1>
        <p className="text-muted-foreground">
          Download a clean export of any part of the database, or everything at once — for migration or disaster recovery. Backups are generated fresh on every download; nothing here modifies live data.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Full System Backup
          </CardTitle>
          <CardDescription>
            All modules bundled into a single ZIP — one Excel workbook and one JSON file per module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BackupDownloadButton
            endpoint="/api/admin/backup/export/full"
            label="Download Full Backup (ZIP)"
            variant="default"
            size="default"
            onDone={refreshHistory}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading backup modules...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((mod) => (
            <Card key={mod.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4" />
                  {mod.label}
                </CardTitle>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <BackupDownloadButton
                    endpoint={`/api/admin/backup/export?module=${mod.key}&format=xlsx`}
                    label="Excel"
                    onDone={refreshHistory}
                  />
                  <BackupDownloadButton
                    endpoint={`/api/admin/backup/export?module=${mod.key}&format=json`}
                    label="JSON"
                    onDone={refreshHistory}
                  />
                </div>
                <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                  {mod.tables.map((table) => (
                    <div key={table.key} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <span className="truncate">{table.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground text-xs">{table.rowCount.toLocaleString("en-IN")}</span>
                        <BackupDownloadButton
                          endpoint={`/api/admin/backup/export?module=${mod.key}&table=${table.key}&format=csv`}
                          label="CSV"
                          size="sm"
                          onDone={refreshHistory}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Backups</CardTitle>
          <CardDescription>Last 50 backup downloads generated from this page.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No backups generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>
                      {log.module === "FULL" ? "Full Backup" : modules.find((m) => m.key === log.module)?.label || log.module}
                      {log.tableKey ? ` / ${log.tableKey}` : ""}
                    </TableCell>
                    <TableCell className="uppercase text-xs">{log.format}</TableCell>
                    <TableCell>{formatBytes(log.fileSizeBytes)}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === "COMPLETED" ? "success" : "destructive"}>{log.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.generatedBy?.name || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
