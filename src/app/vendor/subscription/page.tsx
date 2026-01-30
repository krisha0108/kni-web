import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { Clock, XCircle, CheckCircle, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function VendorSubscriptionPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const vendorProfile = await db.vendorProfile.findUnique({
    where: { userId: session.id },
  });

  if (vendorProfile?.approvalStatus !== "APPROVED") {
    redirect("/vendor/pending");
  }

  const subscriptionStatus = vendorProfile?.subscriptionStatus;
  const trialEndsAt = vendorProfile?.trialEndsAt;
  const activeUntil = vendorProfile?.activeUntil;

  const getSubscriptionDetails = () => {
    if (subscriptionStatus === "TRIAL" && trialEndsAt) {
      const daysLeft = Math.ceil(
        (trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        status: "Trial Period",
        variant: "warning" as const,
        message: "Your trial ends on " + formatDate(trialEndsAt),
        daysLeft,
        icon: Clock,
      };
    }
    if (subscriptionStatus === "ACTIVE" && activeUntil) {
      const daysLeft = Math.ceil(
        (activeUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        status: "Active",
        variant: "success" as const,
        message: "Your subscription is active until " + formatDate(activeUntil),
        daysLeft,
        icon: CheckCircle,
      };
    }
    if (subscriptionStatus === "EXPIRED") {
      return {
        status: "Expired",
        variant: "destructive" as const,
        message: "Your subscription has expired. Please contact admin to renew.",
        daysLeft: 0,
        icon: XCircle,
      };
    }
    if (subscriptionStatus === "BLOCKED") {
      return {
        status: "Blocked",
        variant: "destructive" as const,
        message: "Your account has been blocked. Please contact support.",
        daysLeft: 0,
        icon: XCircle,
      };
    }
    return {
      status: "Pending",
      variant: "secondary" as const,
      message: "Waiting for subscription activation.",
      daysLeft: 0,
      icon: Clock,
    };
  };

  const details = getSubscriptionDetails();
  const StatusIcon = details.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Subscription</h1>
        <p className="text-muted-foreground">
          Manage your vendor subscription
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            Subscription Status
          </CardTitle>
          <CardDescription>{details.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <Badge variant={details.variant}>{details.status}</Badge>
          </div>

          {details.daysLeft > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Days Remaining:</span>
              <span className="text-2xl font-bold">{details.daysLeft}</span>
            </div>
          )}

          {(subscriptionStatus === "EXPIRED" || subscriptionStatus === "BLOCKED") && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                {subscriptionStatus === "EXPIRED"
                  ? "Your products are no longer visible in the marketplace. Please contact admin to renew your subscription."
                  : "Your account has been blocked. Please contact support for assistance."}
              </AlertDescription>
            </Alert>
          )}

          {subscriptionStatus === "TRIAL" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Trial Period</AlertTitle>
              <AlertDescription>
                You are currently on a trial period. Contact admin to upgrade
                to a full subscription before your trial expires.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
