import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { salesmanSidebarItems } from "@/components/layouts/sidebar";
import { ForcePasswordChangeDialog } from "@/components/salesman/force-password-change-dialog";

export default async function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "SALESMAN") {
    redirect("/login");
  }

  return (
    <DashboardLayout
      sidebarItems={salesmanSidebarItems}
      sidebarTitle="KNI Salesman"
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
    >
      <ForcePasswordChangeDialog initialOpen={session.mustChangePassword} />
      {children}
    </DashboardLayout>
  );
}
