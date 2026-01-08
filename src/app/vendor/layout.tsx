import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { vendorSidebarItems } from "@/components/layouts/sidebar";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "VENDOR") {
    redirect("/login");
  }

  // Vendor pending approval should be redirected
  // But we allow access to /vendor/pending and /vendor/subscription
  
  return (
    <DashboardLayout
      sidebarItems={vendorSidebarItems}
      sidebarTitle="KNI Vendor"
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
