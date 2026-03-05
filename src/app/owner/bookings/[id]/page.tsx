"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Clock, MapPin, User, Upload, Star, Wrench, Package, Grid3X3, Shield } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/utils";
import { EngineerRatingDialog } from "@/components/ratings/engineer-rating-dialog";
import { useRestaurant } from "@/contexts/restaurant-context";

interface Booking {
  id: string;
  status: string;
  preferredDate: string;
  preferredTimeSlot: string;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  totalAmount: number;
  gstAmount?: number;
  tipAmount?: number;
  problemDescription?: string;
  notes?: string;
  createdAt: string;
  restaurant: { id: string; name: string; address: string; city: string };
  items: Array<{
    id: string;
    qty: number;
    priceSnapshot: number;
    serviceItem?: {
      id: string;
      name: string;
      category?: { id: string; name: string };
      subCategory?: { id: string; name: string };
    };
    partItem?: {
      id: string;
      name: string;
      category?: { id: string; name: string };
      subCategory?: { id: string; name: string };
    };
  }>;
  paymentProof?: { id: string; screenshotUrl: string; status: string; verifiedAt?: string };
  engineerAssignments?: Array<{
    id: string;
    status: string;
    assignedAt: string;
    engineer?: { id: string; name: string; phone: string };
    workLog?: {
      id: string;
      startedAt?: string;
      completedAt?: string;
      workNotes?: string;
      proofImageUrls?: string[];
    };
    rating?: {
      overallRating: number;
      professionalism?: number;
      technicalSkill?: number;
      communication?: number;
      punctuality?: number;
      problemSolving?: number;
      review?: string;
    } | null;
    servicePin?: string | null;
    servicePinPurpose?: string | null;
    servicePinExpiresAt?: string | null;
  }>;
}

const statusColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  PENDING_PAYMENT: "warning",
  PAYMENT_UPLOADED: "secondary",
  PAYMENT_VERIFIED: "success",
  SCHEDULED: "default",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export default function BookingDetailPage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [assignmentToRate, setAssignmentToRate] = useState<any>(null);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  const { selectedRestaurant } = useRestaurant();
  const userRole = selectedRestaurant?.role;
  const canUpdate = userRole === "OWNER" || userRole === "MANAGER";

  const fetchBooking = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/owner/bookings/" + bookingId);
      const data = await response.json();
      if (data.ok) {
        setBooking(data.data);
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        router.push("/owner/bookings");
      }
    } catch {
      toast({ title: "Error", description: "Failed to load booking", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const openRatingDialog = (assignment: any) => {
    setAssignmentToRate(assignment);
    setIsRatingDialogOpen(true);
  };

  const handleRatingSuccess = () => {
    fetchBooking();
    setIsRatingDialogOpen(false);
    setAssignmentToRate(null);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING_PAYMENT: "Pending Payment",
      PAYMENT_UPLOADED: "Payment Uploaded",
      PAYMENT_VERIFIED: "Payment Verified",
      SCHEDULED: "Scheduled",
      IN_PROGRESS: "In Progress",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/owner/bookings")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Bookings
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Booking Details</h1>
          <p className="text-muted-foreground font-mono">{booking.id}</p>
        </div>
        <Badge variant={statusColors[booking.status]} className="text-sm py-1 px-3">
          {getStatusLabel(booking.status)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Restaurant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Restaurant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{booking.restaurant.name}</p>
              <p className="text-muted-foreground">{booking.restaurant.address}</p>
              <p className="text-muted-foreground">{booking.restaurant.city}</p>
            </CardContent>
          </Card>

          {/* Schedule Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Preferred Date</p>
                  <p className="font-medium">{formatDate(booking.preferredDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Preferred Time</p>
                  <p className="font-medium">{booking.preferredTimeSlot}</p>
                </div>
              </div>
              {booking.scheduledDate && (
                <>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled Date</p>
                      <p className="font-medium text-green-600">{formatDate(booking.scheduledDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled Time</p>
                      <p className="font-medium text-green-600">{booking.scheduledTimeSlot}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Problem Description */}
          {booking.problemDescription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Problem Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{booking.problemDescription}</p>
              </CardContent>
            </Card>
          )}

          {/* Items - Grouped by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Items by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {(() => {
                  // Group items by category
                  const grouped: Record<string, {
                    categoryId: string;
                    categoryName: string;
                    services: typeof booking.items;
                    parts: typeof booking.items;
                  }> = {};

                  booking.items?.forEach((item) => {
                    const itemData = item.serviceItem || item.partItem;
                    const category = itemData?.category;
                    const categoryId = category?.id || "uncategorized";
                    const categoryName = category?.name || "Uncategorized";

                    if (!grouped[categoryId]) {
                      grouped[categoryId] = {
                        categoryId,
                        categoryName,
                        services: [],
                        parts: [],
                      };
                    }

                    if (item.serviceItem) {
                      grouped[categoryId].services.push(item);
                    } else {
                      grouped[categoryId].parts.push(item);
                    }
                  });

                  return Object.values(grouped).map((category) => {
                    const categoryTotal = [...category.services, ...category.parts].reduce(
                      (sum, item) => sum + item.priceSnapshot * item.qty,
                      0
                    );

                    return (
                      <div key={category.categoryId} className="border rounded-lg overflow-hidden">
                        {/* Category Header */}
                        <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                          <div className="flex items-center gap-2">
                            <Grid3X3 className="h-4 w-4" />
                            <span className="font-bold">{category.categoryName}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-muted-foreground">
                              {category.services.length + category.parts.length} items
                            </span>
                            <span className="ml-3 font-bold text-primary">
                              {formatPrice(categoryTotal)}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 space-y-4">
                          {/* Services */}
                          {category.services.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-blue-600">
                                <Wrench className="h-4 w-4" />
                                <span className="text-sm font-semibold uppercase">
                                  Services ({category.services.length})
                                </span>
                              </div>
                              <div className="space-y-2 pl-6">
                                {category.services.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-100"
                                  >
                                    <div>
                                      <span className="font-medium">{item.serviceItem?.name}</span>
                                      {item.serviceItem?.subCategory && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({item.serviceItem.subCategory.name})
                                        </span>
                                      )}
                                      <span className="text-muted-foreground ml-2">x{item.qty}</span>
                                    </div>
                                    <span className="font-medium text-blue-600">
                                      {formatPrice(item.priceSnapshot * item.qty)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Parts */}
                          {category.parts.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-orange-600">
                                <Package className="h-4 w-4" />
                                <span className="text-sm font-semibold uppercase">
                                  Parts ({category.parts.length})
                                </span>
                              </div>
                              <div className="space-y-2 pl-6">
                                {category.parts.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between items-center p-2 bg-orange-50 rounded border border-orange-100"
                                  >
                                    <div>
                                      <span className="font-medium">{item.partItem?.name}</span>
                                      {item.partItem?.subCategory && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({item.partItem.subCategory.name})
                                        </span>
                                      )}
                                      <span className="text-muted-foreground ml-2">x{item.qty}</span>
                                    </div>
                                    <span className="font-medium text-orange-600">
                                      {formatPrice(item.priceSnapshot * item.qty)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}

                <Separator />

                {/* Payment Breakdown */}
                {(() => {
                  // Item subtotal (sum of items before GST)
                  const itemTotal = booking.items?.reduce(
                    (sum, item) => sum + item.priceSnapshot * item.qty, 0
                  ) || 0;

                  // Use DB values if available, else calculate
                  const GST_RATE = 0.18;
                  const gstAmount = booking.gstAmount || Math.round(itemTotal * GST_RATE);
                  const tipAmount = booking.tipAmount || Math.max(0, booking.totalAmount - itemTotal - gstAmount);

                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Item Total</span>
                        <span>{formatPrice(itemTotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>GST (18%)</span>
                        <span>{formatPrice(gstAmount)}</span>
                      </div>
                      {tipAmount > 0 && (
                        <div className="flex justify-between items-center text-green-600">
                          <span>Tip for Professional</span>
                          <span>{formatPrice(tipAmount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>Total Paid</span>
                        <span>{formatPrice(booking.totalAmount)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Engineer Assignment */}
          {booking.engineerAssignments && booking.engineerAssignments.length > 0 && (() => {
            const assignment = booking.engineerAssignments[0]; // Get the latest assignment
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Assigned Engineer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium">{assignment.engineer?.name}</p>
                    <p className="text-muted-foreground">{assignment.engineer?.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assignment Status</p>
                    <Badge>{assignment.status}</Badge>
                  </div>
                  {assignment.workLog && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="font-medium">Work Log</p>
                        {assignment.workLog.startedAt && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Started:</span>{" "}
                            {formatDate(assignment.workLog.startedAt)}
                          </p>
                        )}
                        {assignment.workLog.completedAt && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Completed:</span>{" "}
                            {formatDate(assignment.workLog.completedAt)}
                          </p>
                        )}
                        {assignment.workLog.workNotes && (
                          <div>
                            <p className="text-sm text-muted-foreground">Notes:</p>
                            <p className="text-sm">{assignment.workLog.workNotes}</p>
                          </div>
                        )}
                        {assignment.workLog.proofImageUrls &&
                         Array.isArray(assignment.workLog.proofImageUrls) &&
                         assignment.workLog.proofImageUrls.length > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Completion Proof ({assignment.workLog.proofImageUrls.filter(url => url && url.trim()).length} image{assignment.workLog.proofImageUrls.filter(url => url && url.trim()).length > 1 ? 's' : ''})
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {assignment.workLog.proofImageUrls.filter(url => url && url.trim()).map((url, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={url}
                                    alt={`Work proof ${index + 1}`}
                                    className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(url, "_blank")}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                                    {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              Click images to view full size
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {canUpdate && assignment.status === "COMPLETED" && (
                    <>
                      <Separator />
                      <Button
                        className="w-full"
                        variant={assignment.rating ? "outline" : "default"}
                        onClick={() => openRatingDialog(assignment)}
                      >
                        <Star className="mr-2 h-4 w-4" />
                        {assignment.rating ? "Update Rating" : "Rate Engineer"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>

        <div className="space-y-6">
          {/* Service PIN Card */}
          {booking.engineerAssignments && booking.engineerAssignments.length > 0 && (() => {
            const assignment = booking.engineerAssignments[0];
            if (!assignment.servicePin || !assignment.servicePinExpiresAt) return null;
            const isExpired = new Date() > new Date(assignment.servicePinExpiresAt);
            if (isExpired) return null;
            return (
              <Card className="border-2 border-amber-400 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <Shield className="h-5 w-5" />
                    Service PIN
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-amber-700">
                    {assignment.servicePinPurpose === "START"
                      ? "Engineer wants to START work. Share this PIN:"
                      : "Engineer wants to COMPLETE work. Share this PIN:"}
                  </p>
                  <div className="text-center">
                    <p className="text-4xl font-bold tracking-[0.5em] text-amber-800 bg-white rounded-lg py-3 border-2 border-amber-300">
                      {assignment.servicePin}
                    </p>
                  </div>
                  <p className="text-xs text-amber-600 text-center">
                    Share this PIN only when engineer is physically present.
                    Expires at {new Date(assignment.servicePinExpiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </CardContent>
              </Card>
            );
          })()}

          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.paymentProof ? (
                <>
                  <Badge variant={booking.paymentProof.status === "VERIFIED" ? "success" : "secondary"}>
                    {booking.paymentProof.status}
                  </Badge>
                  {booking.paymentProof.screenshotUrl && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Payment Screenshot</p>
                      <img
                        src={booking.paymentProof.screenshotUrl}
                        alt="Payment proof"
                        className="rounded border max-h-48 w-full object-cover cursor-pointer"
                        onClick={() => window.open(booking.paymentProof!.screenshotUrl, "_blank")}
                      />
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Click to view full size
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No payment uploaded yet</p>
                  {canUpdate && booking.status === "PENDING_PAYMENT" && (
                    <Button
                      className="w-full"
                      onClick={() => router.push("/owner/bookings/" + booking.id + "/payment")}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Payment
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{booking.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(booking.createdAt)}</span>
                </div>
                {booking.paymentProof?.verifiedAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Payment Verified:</span>
                    <span>{formatDate(booking.paymentProof.verifiedAt)}</span>
                  </div>
                )}
                {booking.engineerAssignments && booking.engineerAssignments.length > 0 && booking.engineerAssignments[0].assignedAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Engineer Assigned:</span>
                    <span>{formatDate(booking.engineerAssignments[0].assignedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {assignmentToRate && booking && (
        <EngineerRatingDialog
          bookingId={booking.id}
          assignment={assignmentToRate}
          open={isRatingDialogOpen}
          onOpenChange={setIsRatingDialogOpen}
          onSuccess={handleRatingSuccess}
        />
      )}
    </div>
  );
}