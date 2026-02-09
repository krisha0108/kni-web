import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { Clock, XCircle, CheckCircle, AlertCircle, MapPin } from "lucide-react";
import { RequestReviewButton } from "./request-review-button";

export default async function VendorPendingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [vendorProfile, locationRequests] = await Promise.all([
    db.vendorProfile.findUnique({
      where: { userId: session.id },
    }),
    db.vendorLocationRequest.findMany({
      where: { vendorId: session.id },
      include: {
        area: {
          select: {
            name: true,
            city: { select: { name: true, state: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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

  const hasApprovedLocations = locationRequests.some((lr) => lr.status === "APPROVED");

  // If approved AND has approved locations, redirect to dashboard
  if (status === "APPROVED" && hasApprovedLocations) {
    redirect("/vendor/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Account Status</h1>
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
            {status === "APPROVED" && !hasApprovedLocations && "Location Approval Pending"}
          </CardTitle>
          <CardDescription>
            {status === "PENDING" &&
              "Your vendor application is being reviewed by our team."}
            {status === "REJECTED" &&
              "Unfortunately, your application was not approved."}
            {status === "APPROVED" && !hasApprovedLocations &&
              "Your account is approved but your service locations are pending approval."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Account:</span>
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

          {status === "APPROVED" && !hasApprovedLocations && (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertTitle>Locations Under Review</AlertTitle>
              <AlertDescription>
                Your account is approved but your service locations need admin approval before you can start selling.
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

      {/* Location Requests */}
      {locationRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5" />
              Service Locations
            </CardTitle>
            <CardDescription>
              Areas you requested to serve during registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {locationRequests.map((lr) => (
                <div
                  key={lr.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{lr.area.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lr.area.city.name}, {lr.area.city.state.name}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusColors[lr.status as keyof typeof statusColors]}>
                    {lr.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
