import { redirect } from "next/navigation";
import { getSession, ROLE_HOME_PATH } from "@/server/auth/session";
import { SalesmanResponsiveLayout } from "@/components/layouts/salesman-responsive-layout";
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
    redirect(ROLE_HOME_PATH[session.role]);
  }

  return (
    <SalesmanResponsiveLayout
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
    >
      <ForcePasswordChangeDialog initialOpen={session.mustChangePassword} />
      {children}
    </SalesmanResponsiveLayout>
  );
}
