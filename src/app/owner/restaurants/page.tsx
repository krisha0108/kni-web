"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Building2, Plus, MapPin, Clock, CheckCircle, XCircle, MoreVertical, Eye, Pencil, Trash2, Loader2, ShieldAlert } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  outletType: string | null;
  restaurantImageUrl: string | null;
  fssaiNumber: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  userRole?: "OWNER" | "MANAGER" | "ACCOUNTANT" | "VIEWER";
  pendingDeletionRequest?: { id: string; reason: string; createdAt: string } | null;
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requestDeleteTarget, setRequestDeleteTarget] = useState<Restaurant | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [cancelRequestTarget, setCancelRequestTarget] = useState<Restaurant | null>(null);
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const router = useRouter();

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/owner/restaurants?page=${page}&pageSize=20`);
      const data = await response.json();

      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setRestaurants(Array.isArray(items) ? items : []);
        setTotalPages(Math.ceil(total / 20) || 1);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch restaurants",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch restaurants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [page]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/owner/restaurants/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Restaurant deleted successfully" });
        fetchRestaurants();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete restaurant", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleRequestDeletion = async () => {
    if (!requestDeleteTarget || deletionReason.trim().length < 10) return;

    setIsRequestingDeletion(true);
    try {
      const response = await fetch(`/api/owner/restaurants/${requestDeleteTarget.id}/deletion-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deletionReason }),
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Request submitted", description: "An admin will review your deletion request." });
        fetchRestaurants();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit deletion request", variant: "destructive" });
    } finally {
      setIsRequestingDeletion(false);
      setRequestDeleteTarget(null);
      setDeletionReason("");
    }
  };

  const handleCancelDeletionRequest = async () => {
    if (!cancelRequestTarget) return;

    setIsCancellingRequest(true);
    try {
      const response = await fetch(`/api/owner/restaurants/${cancelRequestTarget.id}/deletion-request`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.ok) {
        toast({ title: "Cancelled", description: "Your deletion request has been cancelled." });
        fetchRestaurants();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to cancel deletion request", variant: "destructive" });
    } finally {
      setIsCancellingRequest(false);
      setCancelRequestTarget(null);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      PENDING: {
        icon: Clock,
        variant: "warning" as const,
        label: "Pending Approval",
        color: "text-yellow-600",
      },
      APPROVED: {
        icon: CheckCircle,
        variant: "success" as const,
        label: "Approved",
        color: "text-green-600",
      },
      REJECTED: {
        icon: XCircle,
        variant: "destructive" as const,
        label: "Rejected",
        color: "text-red-600",
      },
    };
    return configs[status as keyof typeof configs] || configs.PENDING;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // User owns at least one restaurant (or has none yet — new user)
  const hasOwnedRestaurants = restaurants.length === 0 || restaurants.some((r) => r.userRole === "OWNER");

  // Can instantly delete owned restaurants with PENDING or REJECTED status (no real data yet)
  const canDelete = (restaurant: Restaurant) => {
    return restaurant.userRole === "OWNER" && (restaurant.status === "PENDING" || restaurant.status === "REJECTED");
  };

  // Approved restaurants can only be removed via an admin-approved deletion request
  const canRequestDeletion = (restaurant: Restaurant) => {
    return restaurant.userRole === "OWNER" && restaurant.status === "APPROVED" && !restaurant.pendingDeletionRequest;
  };

  const canEdit = (restaurant: Restaurant) => {
    return restaurant.userRole === "OWNER";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Restaurants</h1>
          <p className="text-muted-foreground">
            Manage all your restaurant locations
          </p>
        </div>
        {hasOwnedRestaurants && (
          <Button onClick={() => router.push("/owner/restaurant/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Restaurant
          </Button>
        )}
      </div>

      {restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Restaurants Yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first restaurant
            </p>
            <Button onClick={() => router.push("/owner/restaurant/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Restaurant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => {
            const statusConfig = getStatusConfig(restaurant.status);
            const StatusIcon = statusConfig.icon;

            return (
              <Card
                key={restaurant.id}
                className="relative hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Action Menu */}
                <div className="absolute top-2 right-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/owner/restaurant/${restaurant.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {canEdit(restaurant) && (
                        <DropdownMenuItem
                          onClick={() => router.push(`/owner/restaurant/${restaurant.id}/edit`)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete(restaurant) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(restaurant)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                      {canRequestDeletion(restaurant) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setRequestDeleteTarget(restaurant)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Request Deletion
                          </DropdownMenuItem>
                        </>
                      )}
                      {restaurant.userRole === "OWNER" && restaurant.pendingDeletionRequest && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-amber-600 focus:text-amber-600"
                            onClick={() => setCancelRequestTarget(restaurant)}
                          >
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            Cancel Deletion Request
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/owner/restaurant/${restaurant.id}`)}
                >
                  {restaurant.restaurantImageUrl && (
                    <div className="relative h-40 w-full overflow-hidden">
                      <img
                        src={restaurant.restaurantImageUrl}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge variant={statusConfig.variant}>
                          {restaurant.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                  <CardHeader className={restaurant.restaurantImageUrl ? "pt-4" : "pt-10"}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                      </div>
                      {!restaurant.restaurantImageUrl && (
                        <Badge variant={statusConfig.variant}>
                          {restaurant.status}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-start gap-2 mt-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {restaurant.address}, {restaurant.city}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                        <span className="text-muted-foreground">
                          {statusConfig.label}
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatDate(restaurant.createdAt)}
                      </span>
                    </div>
                    {restaurant.pendingDeletionRequest && (
                      <div className="mt-2">
                        <Badge variant="warning" className="text-xs">
                          <ShieldAlert className="mr-1 h-3 w-3" />
                          Deletion Requested
                        </Badge>
                      </div>
                    )}
                    {restaurant.userRole && restaurant.userRole !== "OWNER" && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {restaurant.userRole}
                        </Badge>
                      </div>
                    )}
                    {restaurant.outletType && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {restaurant.outletType.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    )}
                    {restaurant.fssaiNumber && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        FSSAI: {restaurant.fssaiNumber}
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4 p-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}

      {/* Summary Card */}
      {restaurants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {restaurants.length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {restaurants.filter((r) => r.status === "APPROVED").length}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {restaurants.filter((r) => r.status === "PENDING").length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone
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
      <Dialog open={!!requestDeleteTarget} onOpenChange={(open) => { if (!open) { setRequestDeleteTarget(null); setDeletionReason(""); } }}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Deletion</DialogTitle>
            <DialogDescription>
              &quot;{requestDeleteTarget?.name}&quot; is a live, approved restaurant. Deleting it requires
              admin approval. Your request will only take effect once an admin reviews and approves it.
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
            <Button variant="outline" onClick={() => { setRequestDeleteTarget(null); setDeletionReason(""); }} disabled={isRequestingDeletion}>
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
      <AlertDialog open={!!cancelRequestTarget} onOpenChange={() => setCancelRequestTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Deletion Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this deletion request? &quot;{cancelRequestTarget?.name}&quot; will
              remain active as normal.
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