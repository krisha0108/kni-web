"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EnablePushBanner } from "@/components/notifications/enable-push-banner";
import { useToast } from "@/hooks/use-toast";
import { Home, ClipboardList, MapPin, Building2, CalendarClock, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/salesman/dashboard", label: "Home", icon: Home },
  { href: "/salesman/inquiries", label: "Inquiries", icon: ClipboardList },
  { href: "/salesman/visits", label: "Visits", icon: MapPin },
  { href: "/salesman/companies", label: "Companies", icon: Building2 },
  { href: "/salesman/follow-ups", label: "Follow-ups", icon: CalendarClock },
];

interface SalesmanMobileLayoutProps {
  children: React.ReactNode;
  user: { name: string; email: string; role: string };
}

// Salesman-only shell: a mobile-app-style bottom tab bar instead of the
// shared admin/vendor/engineer left Sidebar, plus a top-right profile
// avatar whose dropdown holds View Profile / Logout. Every other role
// keeps DashboardLayout — this is intentionally not shared.
export function SalesmanMobileLayout({ children, user }: SalesmanMobileLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [followUpsDue, setFollowUpsDue] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/salesman/follow-ups")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.ok) return;
        const now = new Date();
        const due = (data.data as { isDone: boolean; followUpDate: string }[]).filter(
          (f) => !f.isDone && new Date(f.followUpDate) <= now
        ).length;
        setFollowUpsDue(due);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast({ title: "Logged out", description: "You have been logged out successfully." });
      router.push("/login");
    } catch {
      toast({ title: "Error", description: "Failed to logout. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b bg-background px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-[10px] font-extrabold text-primary-foreground">KNI</span>
          </div>
          <span className="font-bold text-sm">KNI Salesman</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Account menu</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/salesman/profile">
                <User className="mr-2 h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Body */}
      <main className="flex-1 p-4 pb-24">
        <EnablePushBanner />
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 h-16 bg-background border-t flex">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px]", isActive ? "text-primary font-semibold" : "text-muted-foreground")}>
                {tab.label}
              </span>
              {tab.href === "/salesman/follow-ups" && followUpsDue > 0 && (
                <span className="absolute top-0.5 right-7 h-1.5 w-1.5 rounded-full bg-destructive" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
