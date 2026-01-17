"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface ExternalLinkButtonProps {
  href: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExternalLinkButton({
  href,
  children = "View",
  variant = "outline",
  size = "sm"
}: ExternalLinkButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => window.open(href, "_blank")}
    >
      <ExternalLink className="h-4 w-4 mr-2" />
      {children}
    </Button>
  );
}
