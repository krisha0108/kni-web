import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default async function RestaurantStatusPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const restaurant = await db.restaurant.findFirst({
    where: { ownerId: session.id },
    orderBy: { createdAt: "desc" },
  });

  if (!restaurant) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>No Restaurant Found</CardTitle>
          <CardDescription>You have not registered a restaurant yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/owner/restaurant/create">Register Restaurant</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    PENDING: {
      icon: Clock,
      variant: "warning" as const,
      title: "Pending Approval",
      description: "Your restaurant is being reviewed by our team.",
    },
    APPROVED: {
      icon: CheckCircle,
      variant: "success" as const,
      title: "Approved",
      description: "Your restaurant has been approved. You can now book services.",
    },
    REJECTED: {
      icon: XCircle,
      variant: "destructive" as const,
      title: "Rejected",
      description: "Your restaurant application was rejected.",
    },
  };

  const config = statusConfig[restaurant.status];
  const StatusIcon = config.icon;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            {restaurant.name}
          </CardTitle>
          <CardDescription>{restaurant.address}, {restaurant.city}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <Badge variant={config.variant}>{restaurant.status}</Badge>
          </div>

          {restaurant.status === "PENDING" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{config.title}</AlertTitle>
              <AlertDescription>{config.description}</AlertDescription>
            </Alert>
          )}

          {restaurant.status === "APPROVED" && (
            <Alert className="border-green-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>{config.title}</AlertTitle>
              <AlertDescription>
                {config.description}
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/owner/equipment">Go to My Equipment</Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {restaurant.status === "REJECTED" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{config.title}</AlertTitle>
              <AlertDescription>
                <p>{restaurant.rejectionReason || "No reason provided."}</p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
