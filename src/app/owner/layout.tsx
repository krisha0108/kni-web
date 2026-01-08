import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ownerSidebarItems } from "@/components/layouts/sidebar";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "OWNER") {
    redirect("/login");
  }

  return (
    <DashboardLayout
      sidebarItems={ownerSidebarItems}
      sidebarTitle="KNI Owner"
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
