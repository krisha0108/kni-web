import { redirect } from "next/navigation";
import { getSession, ROLE_HOME_PATH } from "@/server/auth/session";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { adminSidebarItems } from "@/components/layouts/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "ADMIN") {
    redirect(ROLE_HOME_PATH[session.role]);
  }

  return (
    <DashboardLayout
      sidebarItems={adminSidebarItems}
      sidebarTitle="KNI Admin"
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