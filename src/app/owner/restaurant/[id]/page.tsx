"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClickableImage } from "@/components/ui/clickable-image";
import { ExternalLinkButton } from "@/components/ui/external-link-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, MapPin, Building2, FileText, Pencil, Trash2, Loader2 } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  pincode: string | null;
  restaurantImageUrl: string | null;
  fssaiNumber: string | null;
  fssaiCertificateUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  userRole?: "OWNER" | "MANAGER" | "ACCOUNTANT" | "VIEWER";
}

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const response = await fetch(`/api/owner/restaurants/${id}`);
        const data = await response.json();

        if (data.ok) {
          setRestaurant(data.data);
        } else {
          toast({ title: "Error", description: data.error, variant: "destructive" });
          router.push("/owner/restaurants");
        }
      } catch {
        toast({ title: "Error", description: "Failed to fetch restaurant", variant: "destructive" });
        router.push("/owner/restaurants");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurant();
  }, [id, router, toast]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/owner/restaurants/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Restaurant deleted successfully" });
        router.push("/owner/restaurants");
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete restaurant", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!restaurant) {
    return null;
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

  const isOwner = !restaurant.userRole || restaurant.userRole === "OWNER";
  // Can only delete owned restaurants that are PENDING or REJECTED
  const canDelete = isOwner && (restaurant.status === "PENDING" || restaurant.status === "REJECTED");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="ghost" asChild>
          <Link href="/owner/restaurants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Restaurants
          </Link>
        </Button>
        <div className="flex gap-2">
          {isOwner && (
            <Button variant="outline" asChild>
              <Link href={`/owner/restaurant/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{restaurant.name}&quot;? This action cannot be undone
              and will remove all associated data including equipment, bookings history, and expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}