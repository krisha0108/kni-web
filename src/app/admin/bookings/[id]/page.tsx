"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Calendar, User, CheckCircle, XCircle, UserPlus, Wrench, Package, Grid3X3 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import { RejectionReasonInput } from "@/components/rejection-reason-input";

interface Booking {
  id: string;
  status: string;
  slotStartDateTime?: string;
  slotEndDateTime?: string;
  adminAdjustedSlotStart?: string;
  adminAdjustedSlotEnd?: string;
  totalAmount: number;
  discountPercent?: number;
  discountAmount?: number;
  discountSource?: string | null;
  gstAmount?: number;
  tipAmount?: number;
  problemDescription?: string;
  notes?: string;
  createdAt: string;
  restaurant: { id: string; name: string; address: string; city: string };
  owner: { id: string; name: string; phone: string };
  items: Array<{
    id: string;
    qty: number;
    priceSnapshot: number;
    itemType?: string;
    serviceItem?: {
      name: string;
      category?: { id: string; name: string };
      subCategory?: { id: string; name: string };
    };
    partItem?: {
      name: string;
      category?: { id: string; name: string };
      subCategory?: { id: string; name: string };
    };
  }>;
  isDirectBooking?: boolean;
  adminNotes?: string;
  createdByAdmin?: { id: string; name: string } | null;
  paymentProof?: { id: string; screenshotUrl: string | null; status: string; paymentMethod?: string; razorpayPaymentId?: string };
  engineerAssignments?: Array<{
    id: string;
    status: string;
    assignedAt: string;
    engineer?: { id: string; name: string };
    workLog?: {
      id: string;
      completionNote?: string;
      proofImageUrls?: string[];
      createdAt?: string;
    };
  }>;
}

interface Engineer {
  id: string;
  name: string;
  phone: string;
  isActive?: boolean;
  isAvailable?: boolean;
  availableAt?: boolean;
  conflicts?: { type: string; label: string; start: string; end: string }[];
}

const timeSlots = [
  { value: "09:00-11:00", label: "9:00 AM - 11:00 AM" },
  { value: "11:00-13:00", label: "11:00 AM - 1:00 PM" },
  { value: "14:00-16:00", label: "2:00 PM - 4:00 PM" },
  { value: "16:00-18:00", label: "4:00 PM - 6:00 PM" },
];

export default function AdminBookingDetailPage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedEngineers, setSelectedEngineers] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const fetchBooking = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/bookings/" + bookingId);
      const data = await response.json();
      if (data.ok) {
        setBooking(data.data);
        // Initialize scheduled date/time from existing slot data
        if (data.data.adminAdjustedSlotStart || data.data.slotStartDateTime) {
          const slotDate = new Date(data.data.adminAdjustedSlotStart || data.data.slotStartDateTime);
          setScheduledDate(slotDate.toISOString().split("T")[0]);

          // Extract time range from start/end times
          if (data.data.adminAdjustedSlotEnd || data.data.slotEndDateTime) {
            const endDate = new Date(data.data.adminAdjustedSlotEnd || data.data.slotEndDateTime);
            const startTime = slotDate.toTimeString().substring(0, 5);
            const endTime = endDate.toTimeString().substring(0, 5);
            setScheduledTimeSlot(`${startTime}-${endTime}`);
          }
        }
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        router.push("/admin/bookings");
      }
    } catch {
      toast({ title: "Error", description: "Failed to load booking", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEngineers = async (rangeStart?: string, rangeEnd?: string) => {
    try {
      const searchParams = new URLSearchParams();
      if (rangeStart && rangeEnd) {
        searchParams.set("rangeStart", rangeStart);
        searchParams.set("rangeEnd", rangeEnd);
        searchParams.set("excludeBookingId", bookingId);
      }
      const qs = searchParams.toString();
      const response = await fetch(`/api/admin/engineers${qs ? `?${qs}` : ""}`);
      const data = await response.json();
      if (data.ok) {
        setEngineers(data.data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchBooking();
    fetchEngineers();
  }, [bookingId]);

  // Re-check availability whenever the admin picks/changes the date or time
  // slot inside the Assign Engineer dialog, so busy/free badges stay current.
  useEffect(() => {
    if (!isAssignOpen || !scheduledDate || !scheduledTimeSlot) return;
    const [startTime, endTime] = scheduledTimeSlot.split("-");
    const slotStart = `${scheduledDate}T${startTime}:00`;
    const slotEnd = `${scheduledDate}T${endTime}:00`;
    fetchEngineers(slotStart, slotEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAssignOpen, scheduledDate, scheduledTimeSlot]);

  const handleVerifyPayment = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch("/api/admin/bookings/" + bookingId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-payment",
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Payment verified successfully" });
        fetchBooking();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to verify payment", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRejectPayment = async () => {
    // Validate rejection reason
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      setRejectionError("Rejection reason must be at least 10 characters");
      return;
    }

    setIsRejecting(true);
    setRejectionError("");

    try {
      const response = await fetch("/api/admin/bookings/" + bookingId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject-payment",
          rejectionReason: rejectionReason.trim(),
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Payment rejected successfully" });
        setIsRejectDialogOpen(false);
        setRejectionReason("");
        fetchBooking();
      } else {
        setRejectionError(data.error || "Failed to reject payment");
      }
    } catch {
      setRejectionError("Failed to reject payment");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleAssignEngineer = async () => {
    if (selectedEngineers.length === 0) {
      toast({ title: "Error", description: "Please select at least one engineer", variant: "destructive" });
      return;
    }
    if (!scheduledDate) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }
    if (!scheduledTimeSlot) {
      toast({ title: "Error", description: "Please select a time slot", variant: "destructive" });
      return;
    }

    // Convert scheduledDate and scheduledTimeSlot to ISO datetime strings
    const [startTime, endTime] = scheduledTimeSlot.split("-");
    const slotStart = `${scheduledDate}T${startTime}:00`;
    const slotEnd = `${scheduledDate}T${endTime}:00`;

    setIsAssigning(true);
    try {
      const response = await fetch("/api/admin/bookings/" + bookingId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_engineer",
          engineerId: selectedEngineers,
          slotStart,
          slotEnd,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: data.message || `${selectedEngineers.length} engineer(s) assigned successfully`,
        });
        setIsAssignOpen(false);
        setSelectedEngineers([]);
        fetchBooking();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to assign engineer(s)", variant: "destructive" });
    } finally {
      setIsAssigning(false);
    }
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

  const canVerifyPayment = booking.status === "PAYMENT_UPLOADED" && booking.paymentProof;
  const canAssignEngineer = booking.status === "PAYMENT_VERIFIED" || booking.status === "ENGINEER_ASSIGNED" || booking.status === "REJECTED_BY_ENGINEER";

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/admin/bookings")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Bookings
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Booking Details</h1>
          <p className="text-muted-foreground font-mono">{booking.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {booking.isDirectBooking && (
            <Badge variant="secondary" className="text-sm py-1 px-3">
              Direct Booking
            </Badge>
          )}
          <Badge
            variant={
              booking.status === "COMPLETED"
                ? "success"
                : booking.status === "CANCELLED"
                ? "destructive"
                : "default"
            }
            className="text-sm py-1 px-3"
          >
            {booking.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {/* Direct Booking Info */}
      {booking.isDirectBooking && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
          <p className="text-sm font-medium text-blue-700">
            Direct booking created by {booking.createdByAdmin?.name || "Admin"}
          </p>
          {booking.adminNotes && (
            <p className="text-sm text-blue-600">Notes: {booking.adminNotes}</p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Restaurant & Owner */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Restaurant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{booking.restaurant.name}</p>
                <p className="text-sm text-muted-foreground">{booking.restaurant.address}</p>
                <p className="text-sm text-muted-foreground">{booking.restaurant.city}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{booking.owner.name}</p>
                <p className="text-sm text-muted-foreground">{booking.owner.phone}</p>
              </CardContent>
            </Card>
          </div>

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

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {booking.slotStartDateTime && (
                  <div>
                    <p className="text-sm text-muted-foreground">Requested Slot</p>
                    <p className="font-medium">{formatDate(booking.slotStartDateTime)}</p>
                  </div>
                )}
                {(booking.adminAdjustedSlotStart || booking.slotStartDateTime) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled Slot</p>
                      <p className="font-medium text-green-600">
                        {formatDate((booking.adminAdjustedSlotStart || booking.slotStartDateTime) as string)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

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
                  // Item/base total: priceSnapshot values are GST-EXCLUSIVE
                  // base prices (see computeBookingTotal in lib/booking-pricing.ts,
                  // used identically by both the owner booking flow and the
                  // admin direct-booking flow: base -> minus discount -> plus
                  // GST(18%) on the discounted base -> plus tip = totalAmount).
                  const itemTotal = booking.items?.reduce(
                    (sum, item) => sum + item.priceSnapshot * item.qty, 0
                  ) || 0;

                  // Use the actual snapshotted discount/GST/tip fields from the
                  // booking record rather than re-deriving them from itemTotal,
                  // which silently dropped the discount and produced numbers
                  // that didn't reconcile with Total Paid whenever a discount
                  // (offer/referral/custom rate) had been applied.
                  const discountAmount = booking.discountAmount || 0;
                  const gstAmount = booking.gstAmount ?? Math.round((itemTotal - discountAmount) * 0.18);
                  const tipAmount = booking.tipAmount || 0;

                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Base Amount</span>
                        <span>{formatPrice(itemTotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-green-600">
                          <span>
                            Discount
                            {booking.discountSource ? ` (${booking.discountSource})` : ""}
                          </span>
                          <span>-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
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
        </div>

        <div className="space-y-6">
          {/* Payment Proof */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Proof</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.paymentProof ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        booking.paymentProof.status === "VERIFIED"
                          ? "success"
                          : booking.paymentProof.status === "REJECTED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {booking.paymentProof.status}
                    </Badge>
                    {booking.paymentProof.paymentMethod === "RAZORPAY" ? (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        Razorpay (Auto-Verified)
                      </Badge>
                    ) : (
                      <Badge variant="outline">Screenshot</Badge>
                    )}
                  </div>
                  {booking.paymentProof.razorpayPaymentId && (
                    <p className="text-xs text-muted-foreground">
                      Razorpay Payment ID: {booking.paymentProof.razorpayPaymentId}
                    </p>
                  )}
                  {booking.paymentProof.screenshotUrl && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Payment Screenshot</p>
                      <img
                        src={booking.paymentProof.screenshotUrl}
                        alt="Payment proof"
                        className="rounded border max-h-64 w-full object-contain cursor-pointer bg-muted"
                        onClick={() => window.open(booking.paymentProof!.screenshotUrl!, "_blank")}
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Click image to view full size in new tab
                      </p>
                    </div>
                  )}
                  {canVerifyPayment && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={handleVerifyPayment}
                        disabled={isVerifying || isRejecting}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {isVerifying ? "Verifying..." : "Verify"}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setIsRejectDialogOpen(true)}
                        disabled={isVerifying || isRejecting}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No payment proof uploaded</p>
              )}
            </CardContent>
          </Card>

          {/* Engineer Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Engineer Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.engineerAssignments && booking.engineerAssignments.length > 0 ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Assigned Engineers ({booking.engineerAssignments.length})
                      </p>
                      <div className="space-y-3">
                        {booking.engineerAssignments.map((assignment) => (
                          <div key={assignment.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-start">
                              <p className="font-medium">{assignment.engineer?.name}</p>
                              <Badge
                                variant={
                                  assignment.status === "COMPLETED"
                                    ? "success"
                                    : assignment.status === "ACCEPTED"
                                    ? "default"
                                    : assignment.status === "REJECTED"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {assignment.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Assigned: {formatDate(assignment.assignedAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {(booking.adminAdjustedSlotStart || booking.slotStartDateTime) && (
                      <div>
                        <p className="text-sm text-muted-foreground">Scheduled Slot</p>
                        <p className="font-medium text-green-600">
                          {formatDate((booking.adminAdjustedSlotStart || booking.slotStartDateTime) as string)}
                        </p>
                      </div>
                    )}
                  </div>
                  {canAssignEngineer && (
                    <Button className="w-full" onClick={() => setIsAssignOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign More Engineers
                    </Button>
                  )}
                </>
              ) : canAssignEngineer ? (
                <Button className="w-full" onClick={() => setIsAssignOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign Engineer(s)
                </Button>
              ) : (
                <p className="text-muted-foreground">
                  {booking.status === "PAYMENT_VERIFIED"
                    ? "Ready to assign engineer(s)"
                    : "Payment verification required first"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Work Completion Proof */}
          {booking.engineerAssignments && booking.engineerAssignments.some(a => a.workLog) && (
            <Card>
              <CardHeader>
                <CardTitle>Work Completion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.engineerAssignments
                  .filter(a => a.workLog)
                  .map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Engineer</p>
                        <p className="font-medium">{assignment.engineer?.name}</p>
                      </div>
                      {assignment.workLog?.completionNote && (
                        <div>
                          <p className="text-sm text-muted-foreground">Completion Notes</p>
                          <p className="text-sm">{assignment.workLog.completionNote}</p>
                        </div>
                      )}
                      {assignment.workLog?.proofImageUrls && Array.isArray(assignment.workLog.proofImageUrls) && assignment.workLog.proofImageUrls.length > 0 && (
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
                      {assignment.workLog?.createdAt && (
                        <div>
                          <p className="text-sm text-muted-foreground">Completed At</p>
                          <p className="text-sm">{formatDate(assignment.workLog.createdAt)}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Assign Engineer Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Engineer</DialogTitle>
            <DialogDescription>
              Select an engineer and confirm the schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Scheduled Date *</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Scheduled Time *</Label>
              <Select value={scheduledTimeSlot} onValueChange={setScheduledTimeSlot}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Engineers * (Select one or more)</Label>
              {!(scheduledDate && scheduledTimeSlot) && (
                <p className="text-xs text-muted-foreground">
                  Pick a date and time above to see who&apos;s available for that slot.
                </p>
              )}
              <div className="border rounded-md p-3 max-h-56 overflow-y-auto space-y-2">
                {engineers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No engineers available</p>
                ) : (
                  engineers.map((eng) => (
                    <div key={eng.id} className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id={`engineer-${eng.id}`}
                        checked={selectedEngineers.includes(eng.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEngineers([...selectedEngineers, eng.id]);
                          } else {
                            setSelectedEngineers(selectedEngineers.filter((id) => id !== eng.id));
                          }
                        }}
                        className="h-4 w-4 mt-0.5 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`engineer-${eng.id}`}
                          className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                        >
                          {eng.name}
                          {scheduledDate && scheduledTimeSlot && (
                            <Badge variant={eng.availableAt === false ? "destructive" : "success"} className="text-xs">
                              {eng.availableAt === false ? "Busy" : "Available"}
                            </Badge>
                          )}
                        </label>
                        {eng.availableAt === false && eng.conflicts && eng.conflicts.length > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Busy: {eng.conflicts[0].label}, {formatDateTime(eng.conflicts[0].start)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {selectedEngineers.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedEngineers.length} engineer(s) selected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignEngineer} disabled={isAssigning}>
              {isAssigning ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Payment Proof</DialogTitle>
            <DialogDescription>
              Please provide a detailed reason for rejecting this payment proof. This will be sent to the restaurant owner.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RejectionReasonInput
              value={rejectionReason}
              onChange={(value) => {
                setRejectionReason(value);
                setRejectionError("");
              }}
              category="PAYMENT_PROOF"
              error={rejectionError}
              required
              showTemplates
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
                setRejectionError("");
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectPayment}
              disabled={isRejecting || rejectionReason.trim().length < 10}
            >
              {isRejecting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}