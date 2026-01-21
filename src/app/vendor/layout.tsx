import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/server/auth/session";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { vendorSidebarItems } from "@/components/layouts/sidebar";

// Pages that unapproved vendors can access
const ALLOWED_UNAPPROVED_PATHS = ["/vendor/pending"];
// Pages that blocked/expired vendors can access
const ALLOWED_BLOCKED_PATHS = ["/vendor/pending", "/vendor/subscription"];

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

  // Get current path from middleware header
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Use session data for approval and subscription status
  const approvalStatus = session.vendorApprovalStatus;
  const subscriptionStatus = session.vendorSubscriptionStatus;

  // Check if current path is allowed for the vendor's status
  const isAllowedUnapprovedPath = ALLOWED_UNAPPROVED_PATHS.some(p => pathname.startsWith(p));
  const isAllowedBlockedPath = ALLOWED_BLOCKED_PATHS.some(p => pathname.startsWith(p));

  // Redirect unapproved vendors to pending page
  if (approvalStatus !== "APPROVED" && !isAllowedUnapprovedPath) {
    redirect("/vendor/pending");
  }

  // Redirect blocked/expired vendors to subscription page
  if (approvalStatus === "APPROVED" &&
      (subscriptionStatus === "EXPIRED" || subscriptionStatus === "BLOCKED") &&
      !isAllowedBlockedPath) {
    redirect("/vendor/subscription");
  }

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
