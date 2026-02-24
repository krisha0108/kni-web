import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/server/auth/session";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { vendorSidebarItems } from "@/components/layouts/sidebar";
import { AlertTriangle, MapPin } from "lucide-react";

// Pages that unapproved vendors can access (account not approved)
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
  const now = new Date();

  // Check if subscription is actually expired (date-based check)
  const isTrialExpired = subscriptionStatus === "TRIAL" && session.vendorTrialEndsAt && new Date(session.vendorTrialEndsAt) < now;
  const isActiveExpired = subscriptionStatus === "ACTIVE" && session.vendorActiveUntil && new Date(session.vendorActiveUntil) < now;
  const isSubscriptionInvalid = subscriptionStatus === "EXPIRED" || subscriptionStatus === "BLOCKED" || isTrialExpired || isActiveExpired;

  // Check if current path is allowed for the vendor's status
  const isAllowedUnapprovedPath = ALLOWED_UNAPPROVED_PATHS.some(p => pathname.startsWith(p));
  const isAllowedBlockedPath = ALLOWED_BLOCKED_PATHS.some(p => pathname.startsWith(p));

  // Redirect unapproved vendors to pending page (account not yet approved by admin)
  if (approvalStatus !== "APPROVED" && !isAllowedUnapprovedPath) {
    redirect("/vendor/pending");
  }

  // Redirect blocked/expired vendors to subscription page
  if (approvalStatus === "APPROVED" && isSubscriptionInvalid && !isAllowedBlockedPath) {
    redirect("/vendor/subscription");
  }

  const showLocationWarning = approvalStatus === "APPROVED" && !session.hasApprovedLocation;

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
      {showLocationWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mx-4 mt-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              Your service locations are pending approval
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              You can browse everything, but adding or managing products, orders, and categories requires at least one approved location.{" "}
              <a href="/vendor/locations" className="underline font-medium inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Manage Locations
              </a>
            </p>
          </div>
        </div>
      )}
      {children}
    </DashboardLayout>
  );
}
