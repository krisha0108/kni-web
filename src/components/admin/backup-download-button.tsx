"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BackupDownloadButtonProps {
  endpoint: string;
  label: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm";
  onDone?: () => void;
}

export function BackupDownloadButton({ endpoint, label, variant = "outline", size = "sm", onDone }: BackupDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setLoading(true);
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Download failed");
      }
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : "backup";
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Backup downloaded", description: filename });
      onDone?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download backup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} variant={variant} size={size} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
}
