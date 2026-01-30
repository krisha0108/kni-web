import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClickableImage } from "@/components/ui/clickable-image";
import { ExternalLinkButton } from "@/components/ui/external-link-button";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, MapPin, Building2, FileText } from "lucide-react";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const restaurant = await db.restaurant.findFirst({
    where: {
      id,
      ownerId: session.id,
    },
  });

  if (!restaurant) {
    notFound();
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
      description: "Your restaurant has been approved. You can now book services for this location.",
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
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/owner/restaurants">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Restaurants
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <div>
                <CardTitle className="text-2xl">{restaurant.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4" />
                  {restaurant.address}, {restaurant.city}
                </CardDescription>
              </div>
            </div>
            <Badge variant={config.variant} className="text-sm py-1 px-3">
              {restaurant.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Restaurant Image */}
          {restaurant.restaurantImageUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Restaurant Image</p>
              <div className="relative h-48 w-full rounded-lg overflow-hidden border">
                <ClickableImage
                  src={restaurant.restaurantImageUrl}
                  alt={restaurant.name}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              </div>
              <p className="text-xs text-muted-foreground">Click image to view full size</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Restaurant Name</p>
                <p className="font-medium">{restaurant.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={config.variant}>{restaurant.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{restaurant.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-medium">{restaurant.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {new Date(restaurant.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* FSSAI Details */}
          {(restaurant.fssaiNumber || restaurant.fssaiCertificateUrl) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                FSSAI Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {restaurant.fssaiNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">FSSAI License Number</p>
                    <p className="font-mono font-medium">{restaurant.fssaiNumber}</p>
                  </div>
                )}
                {restaurant.fssaiCertificateUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">FSSAI Certificate</p>
                    <ExternalLinkButton href={restaurant.fssaiCertificateUrl}>
                      View Certificate
                    </ExternalLinkButton>
                  </div>
                )}
              </div>
              {restaurant.fssaiCertificateUrl && (
                <div className="relative h-32 w-full rounded-lg overflow-hidden border">
                  <ClickableImage
                    src={restaurant.fssaiCertificateUrl}
                    alt="FSSAI Certificate"
                    className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Alerts */}
      <Card>
        <CardContent className="pt-6 space-y-4">
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
                <p className="mb-4">{config.description}</p>
                <div className="flex gap-2">
                  <Button asChild size="sm">
                    <Link href="/owner/equipment">My Equipment</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/owner/bookings">My Bookings</Link>
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
