import { redirect } from "next/navigation";
import { getSession, ROLE_HOME_PATH } from "@/server/auth/session";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { engineerSidebarItems } from "@/components/layouts/sidebar";

export default async function EngineerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "ENGINEER") {
    redirect(ROLE_HOME_PATH[session.role]);
  }

  return (
    <DashboardLayout
      sidebarItems={engineerSidebarItems}
      sidebarTitle="KNI Engineer"
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