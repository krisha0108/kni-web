"use client";

import { DashboardLayout } from "./dashboard-layout";
import { SalesmanMobileLayout } from "./salesman-mobile-layout";
import { salesmanSidebarItems } from "./sidebar";
import { useIsDesktop } from "@/hooks/use-is-desktop";

interface SalesmanResponsiveLayoutProps {
  children: React.ReactNode;
  user: { name: string; email: string; role: string };
}

// Phone: the mobile-app-style bottom tab bar (SalesmanMobileLayout).
// Desktop/laptop: the same sidebar shell every other role gets (DashboardLayout).
// Only one of the two mounts at a time, so neither one's own data-fetching
// effects double-fire.
export function SalesmanResponsiveLayout({ children, user }: SalesmanResponsiveLayoutProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop === undefined) return null;

  if (isDesktop) {
    return (
      <DashboardLayout sidebarItems={salesmanSidebarItems} sidebarTitle="KNI Salesman" user={user}>
        {children}
      </DashboardLayout>
    );
  }

  return <SalesmanMobileLayout user={user}>{children}</SalesmanMobileLayout>;
}
