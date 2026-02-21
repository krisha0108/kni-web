"use client";

import { useState } from "react";
import { Sidebar, type SidebarEntry } from "./sidebar";
import { Topbar } from "./topbar";
import { ClientOnly } from "@/components/client-only";
import { EnablePushBanner } from "@/components/notifications/enable-push-banner";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarItems: SidebarEntry[];
  sidebarTitle: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function DashboardLayout({
  children,
  sidebarItems,
  sidebarTitle,
  user,
}: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar items={sidebarItems} title={sidebarTitle} />
      
      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card transform transition-transform lg:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar items={sidebarItems} title={sidebarTitle} mobile />
      </div>

      <div className="lg:pl-64">
        <ClientOnly>
          <Topbar
            user={user}
            onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </ClientOnly>
        <main className="p-4 lg:p-6">
          <ClientOnly>
            <EnablePushBanner />
          </ClientOnly>
          {children}
        </main>
      </div>
    </div>
  );
}
