import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { Clock, XCircle, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { RequestReviewButton } from "./request-review-button";

export default async function VendorPendingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const vendorProfile = await db.vendorProfile.findUnique({
    where: { userId: session.id },
  });

  const statusIcons = {
    PENDING: Clock,
    REJECTED: XCircle,
    APPROVED: CheckCircle,
  };

  const statusColors = {
    PENDING: "warning" as const,
    REJECTED: "destructive" as const,
    APPROVED: "success" as const,
  };

  const status = (vendorProfile?.approvalStatus || "PENDING") as "PENDING" | "REJECTED" | "APPROVED";
  const StatusIcon = statusIcons[status];

  // If approved, redirect to dashboard
  if (status === "APPROVED") {
    redirect("/vendor/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Status</h1>
        <p className="text-muted-foreground">
          Your vendor account approval status
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            {status === "PENDING" && "Pending Approval"}
            {status === "REJECTED" && "Application Rejected"}
          </CardTitle>
          <CardDescription>
            {status === "PENDING" &&
              "Your vendor application is being reviewed by our team."}
            {status === "REJECTED" &&
              "Unfortunately, your application was not approved."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <Badge variant={statusColors[status]}>{status}</Badge>
          </div>

          {status === "PENDING" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Under Review</AlertTitle>
              <AlertDescription>
                We typically review applications within 24-48 hours. You will
                receive a notification once your application is processed.
              </AlertDescription>
            </Alert>
          )}

          {status === "REJECTED" && (
            <>
              {(vendorProfile?.rejectionReason || vendorProfile?.approvalNote) && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Rejection Reason</AlertTitle>
                  <AlertDescription>
                    {vendorProfile.rejectionReason || vendorProfile.approvalNote}
                  </AlertDescription>
                </Alert>
              )}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  If you have addressed the issues mentioned above, you can request a re-review of your application.
                </p>
                <RequestReviewButton />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
