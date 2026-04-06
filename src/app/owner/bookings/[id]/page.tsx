"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Clock, MapPin, User, Upload, Star, Wrench, Package, Grid3X3, Shield, CheckCircle2, CreditCard, UserCheck, Cog, Trophy, Ban, XCircle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/utils";
import { EngineerRatingDialog } from "@/components/ratings/engineer-rating-dialog";
import { useRestaurant } from "@/contexts/restaurant-context";

interface Booking {
  id: string;
  status: string;
  slotStartDateTime: string;
  slotEndDateTime?: string;
  adminAdjustedSlotStart?: string;
  adminAdjustedSlotEnd?: string;
  totalAmount: number;
  gstAmount?: number;
  tipAmount?: number;
  problemDescription?: string;
  notes?: string;
  cancellationReason?: string;
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
  DRAFT: "secondary",
  SLOT_SELECTED: "warning",
  PAYMENT_UPLOADED: "secondary",
  PAYMENT_VERIFIED: "success",
  PAYMENT_REJECTED: "destructive",
  ENGINEER_ASSIGNED: "default",
  ACCEPTED_BY_ENGINEER: "default",
  IN_PROGRESS: "default",
  REJECTED_BY_ENGINEER: "destructive",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

const BOOKING_STEPS = [
  { key: "SLOT_SELECTED", label: "Booked", icon: Calendar },
  { key: "PAYMENT", label: "Payment", icon: CreditCard },
  { key: "VERIFIED", label: "Verified", icon: CheckCircle2 },
  { key: "ASSIGNED", label: "Assigned", icon: UserCheck },
  { key: "IN_PROGRESS", label: "In Progress", icon: Cog },
  { key: "COMPLETED", label: "Completed", icon: Trophy },
];

function getBookingStep(status: string): number {
  const stepMap: Record<string, number> = {
    DRAFT: 0,
    SLOT_SELECTED: 0,
    PAYMENT_UPLOADED: 1,
    PAYMENT_VERIFIED: 2,
    PAYMENT_REJECTED: 1,
    ENGINEER_ASSIGNED: 3,
    ACCEPTED_BY_ENGINEER: 3,
    IN_PROGRESS: 4,
    REJECTED_BY_ENGINEER: 3,
    COMPLETED: 5,
    CANCELLED: -1,
  };
  return stepMap[status] ?? 0;
}

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

  const fetchBooking = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await fetch("/api/owner/bookings/" + bookingId);
      const data = await response.json();
      if (data.ok) {
        setBooking(data.data);
      } else {
        if (!silent) {
          toast({ title: "Error", description: data.error, variant: "destructive" });
          router.push("/owner/bookings");
        }
      }
    } catch {
      if (!silent) {
        toast({ title: "Error", description: "Failed to load booking", variant: "destructive" });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  // Auto-refresh polling every 30 seconds for non-terminal booking statuses
  const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED"];
  const isPollingActive = booking && !TERMINAL_STATUSES.includes(booking.status);

  useEffect(() => {
    if (!isPollingActive) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchBooking(true);
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isPollingActive, bookingId]);

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
      DRAFT: "Draft",
      SLOT_SELECTED: "Slot Selected",
      PAYMENT_UPLOADED: "Payment Uploaded",
      PAYMENT_VERIFIED: "Payment Verified",
      PAYMENT_REJECTED: "Payment Rejected",
      ENGINEER_ASSIGNED: "Engineer Assigned",
      ACCEPTED_BY_ENGINEER: "Engineer Accepted",
      IN_PROGRESS: "In Progress",
      REJECTED_BY_ENGINEER: "Engineer Rejected",
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
        <div className="flex items-center gap-2">
          <Badge variant={statusColors[booking.status]} className="text-sm py-1 px-3">
            {getStatusLabel(booking.status)}
          </Badge>
          {isPollingActive && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </span>
          )}
        </div>
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
                  <p className="text-sm text-muted-foreground">Requested Slot</p>
                  <p className="font-medium">{formatDate(booking.slotStartDateTime)}</p>
                </div>
                {booking.slotEndDateTime && (
                  <div>
                    <p className="text-sm text-muted-foreground">Slot End</p>
                    <p className="font-medium">{formatDate(booking.slotEndDateTime)}</p>
                  </div>
                )}
              </div>
              {booking.adminAdjustedSlotStart && (
                <>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Confirmed Slot (Admin)</p>
                      <p className="font-medium text-green-600">{formatDate(booking.adminAdjustedSlotStart)}</p>
                    </div>
                    {booking.adminAdjustedSlotEnd && (
                      <div>
                        <p className="text-sm text-muted-foreground">Confirmed End</p>
                        <p className="font-medium text-green-600">{formatDate(booking.adminAdjustedSlotEnd)}</p>
                      </div>
                    )}
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
                  <p className="text-muted-foreground">Payment pending</p>
                  {canUpdate && (booking.status === "SLOT_SELECTED" || booking.status === "PAYMENT_REJECTED") && (
                    <Button
                      className="w-full"
                      onClick={() => router.push("/owner/bookings/" + booking.id + "/payment")}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Now
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

          {/* Progress Timeline Stepper */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.status === "CANCELLED" ? (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <Ban className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-900 dark:text-red-100">Booking Cancelled</p>
                    {booking.notes && <p className="text-xs text-red-700 dark:text-red-200 mt-0.5">{booking.notes}</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    {BOOKING_STEPS.map((step, idx) => {
                      const currentStep = getBookingStep(booking.status);
                      const isCompleted = idx < currentStep;
                      const isCurrent = idx === currentStep;
                      const StepIcon = step.icon;
                      return (
                        <div key={step.key} className="flex flex-col items-center flex-1 relative">
                          {idx > 0 && (
                            <div
                              className={`absolute top-4 right-1/2 left-[-50%] h-0.5 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`}
                              style={{ zIndex: 0 }}
                            />
                          )}
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                            isCompleted ? "bg-green-500 border-green-500 text-white" :
                            isCurrent ? "bg-white border-primary text-primary border-[3px]" :
                            "bg-gray-50 border-gray-200 text-gray-400"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <StepIcon className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className={`text-[10px] mt-1 text-center leading-tight ${
                            isCompleted ? "text-green-600 font-semibold" :
                            isCurrent ? "text-primary font-bold" :
                            "text-gray-400"
                          }`}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Payment Rejected Warning */}
                  {booking.status === "PAYMENT_REJECTED" && (
                    <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-200">Payment was rejected. Please re-upload payment proof.</p>
                    </div>
                  )}

                  {/* Engineer Rejected Warning */}
                  {booking.status === "REJECTED_BY_ENGINEER" && (
                    <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-200">Engineer rejected the assignment. Admin will assign a new engineer.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Key Dates */}
              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(booking.createdAt)}</span>
                </div>
                {booking.paymentProof?.verifiedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-muted-foreground">Payment Verified:</span>
                    <span>{formatDate(booking.paymentProof.verifiedAt)}</span>
                  </div>
                )}
                {booking.engineerAssignments && booking.engineerAssignments.length > 0 && booking.engineerAssignments[0].assignedAt && (
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-muted-foreground">Engineer Assigned:</span>
                    <span>{formatDate(booking.engineerAssignments[0].assignedAt)}</span>
                  </div>
                )}
                {booking.engineerAssignments?.[0]?.workLog?.startedAt && (
                  <div className="flex items-center gap-2">
                    <Cog className="h-3.5 w-3.5 text-orange-600" />
                    <span className="text-muted-foreground">Work Started:</span>
                    <span>{formatDate(booking.engineerAssignments[0].workLog.startedAt)}</span>
                  </div>
                )}
                {booking.engineerAssignments?.[0]?.workLog?.completedAt && (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-muted-foreground">Completed:</span>
                    <span>{formatDate(booking.engineerAssignments[0].workLog.completedAt)}</span>
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