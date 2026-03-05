import { ReactNode } from "react";

interface MockupCardProps {
  title: string;
  headerColor?: string;
  children: ReactNode;
}

export function MockupCard({
  title,
  headerColor = "#dc2626",
  children,
}: MockupCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-lg">
      {/* Simulated app header bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 text-white"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
        </div>
        <span className="text-sm font-medium">{title}</span>
      </div>
      {/* Mockup content */}
      <div className="p-4">{children}</div>
    </div>
  );
}