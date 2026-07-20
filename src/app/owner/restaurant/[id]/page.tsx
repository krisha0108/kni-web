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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, MapPin, Building2, FileText, Pencil, Trash2, Loader2, ShieldAlert } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  pincode: string | null;
  outletType: string | null;
  restaurantImageUrl: string | null;
  fssaiNumber: string | null;
  fssaiCertificateUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  userRole?: "OWNER" | "MANAGER" | "ACCOUNTANT" | "VIEWER";
  pendingDeletionRequest?: { id: string; reason: string; createdAt: string } | null;
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
  const [showRequestDeleteDialog, setShowRequestDeleteDialog] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [showCancelRequestDialog, setShowCancelRequestDialog] = useState(false);
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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

  useEffect(() => {
    fetchRestaurant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const handleRequestDeletion = async () => {
    if (deletionReason.trim().length < 10) return;
    setIsRequestingDeletion(true);
    try {
      const response = await fetch(`/api/owner/restaurants/${id}/deletion-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deletionReason }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Request submitted", description: "An admin will review your deletion request." });
        fetchRestaurant();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit deletion request", variant: "destructive" });
    } finally {
      setIsRequestingDeletion(false);
      setShowRequestDeleteDialog(false);
      setDeletionReason("");
    }
  };

  const handleCancelDeletionRequest = async () => {
    setIsCancellingRequest(true);
    try {
      const response = await fetch(`/api/owner/restaurants/${id}/deletion-request`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Cancelled", description: "Your deletion request has been cancelled." });
        fetchRestaurant();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to cancel deletion request", variant: "destructive" });
    } finally {
      setIsCancellingRequest(false);
      setShowCancelRequestDialog(false);
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
  // Can instantly delete owned restaurants that are PENDING or REJECTED (no real data yet)
  const canDelete = isOwner && (restaurant.status === "PENDING" || restaurant.status === "REJECTED");
  // Approved restaurants can only be removed via an admin-approved deletion request
  const canRequestDeletion = isOwner && restaurant.status === "APPROVED" && !restaurant.pendingDeletionRequest;

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
          {canRequestDeletion && (
            <Button
              variant="destructive"
              onClick={() => setShowRequestDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Request Deletion
            </Button>
          )}
          {isOwner && restaurant.pendingDeletionRequest && (
            <Button
              variant="outline"
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={() => setShowCancelRequestDialog(true)}
              disabled={isCancellingRequest}
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Cancel Deletion Request
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
              {restaurant.outletType && (
                <div>
                  <p className="text-sm text-muted-foreground">Outlet Type</p>
                  <Badge variant="outline" className="mt-1">{restaurant.outletType.replace(/_/g, ' ')}</Badge>
                </div>
              )}
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

          {restaurant.pendingDeletionRequest && (
            <Alert className="border-amber-500">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <AlertTitle>Deletion Requested</AlertTitle>
              <AlertDescription>
                You requested deletion of this restaurant on{" "}
                {new Date(restaurant.pendingDeletionRequest.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                . It will be permanently deleted once an admin approves the request.
                <p className="mt-2 text-sm text-muted-foreground">
                  Reason: {restaurant.pendingDeletionRequest.reason}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-amber-700 border-amber-400 hover:bg-amber-100"
                  onClick={() => setShowCancelRequestDialog(true)}
                  disabled={isCancellingRequest}
                >
                  Cancel Request
                </Button>
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

      {/* Request Deletion Dialog - approved restaurants require admin approval */}
      <Dialog
        open={showRequestDeleteDialog}
        onOpenChange={(open) => { setShowRequestDeleteDialog(open); if (!open) setDeletionReason(""); }}
      >
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Deletion</DialogTitle>
            <DialogDescription>
              &quot;{restaurant.name}&quot; is a live, approved restaurant. Deleting it requires admin
              approval. Your request will only take effect once an admin reviews and approves it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for deletion</Label>
              <Textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Explain why this restaurant should be deleted (min 10 characters)..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDeleteDialog(false)} disabled={isRequestingDeletion}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRequestDeletion}
              disabled={isRequestingDeletion || deletionReason.trim().length < 10}
            >
              {isRequestingDeletion ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Deletion Request Confirmation */}
      <AlertDialog open={showCancelRequestDialog} onOpenChange={setShowCancelRequestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Deletion Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this deletion request? &quot;{restaurant.name}&quot; will remain
              active as normal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancellingRequest}>No, keep request</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelDeletionRequest} disabled={isCancellingRequest}>
              {isCancellingRequest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, cancel request"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}