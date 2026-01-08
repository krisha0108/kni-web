"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Clock, MapPin, User, Upload } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/utils";

interface Booking {
  id: string;
  status: string;
  preferredDate: string;
  preferredTimeSlot: string;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  restaurant: { id: string; name: string; address: string; city: string };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    serviceItem?: { id: string; name: string };
    partItem?: { id: string; name: string };
  }>;
  paymentProof?: { id: string; imageUrl: string; status: string; verifiedAt?: string };
  engineerAssignment?: {
    id: string;
    status: string;
    assignedAt: string;
    engineer?: { id: string; name: string; phone: string };
    workLog?: {
      id: string;
      startedAt?: string;
      completedAt?: string;
      workNotes?: string;
      proofImageUrl?: string;
    };
  };
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
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  useEffect(() => {
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
    fetchBooking();
  }, [bookingId]);

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

      <div className="flex items-center justify-between">
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

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {booking.items.map((item) => {
                  const itemData = item.serviceItem || item.partItem;
                  const isService = !!item.serviceItem;
                  return (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{itemData?.name}</span>
                        <span className="text-xs ml-2 px-2 py-0.5 rounded bg-muted">
                          {isService ? "Service" : "Part"}
                        </span>
                        <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                      </div>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  );
                })}
                <Separator />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(booking.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engineer Assignment */}
          {booking.engineerAssignment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assigned Engineer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{booking.engineerAssignment.engineer?.name}</p>
                  <p className="text-muted-foreground">{booking.engineerAssignment.engineer?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assignment Status</p>
                  <Badge>{booking.engineerAssignment.status}</Badge>
                </div>
                {booking.engineerAssignment.workLog && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="font-medium">Work Log</p>
                      {booking.engineerAssignment.workLog.startedAt && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Started:</span>{" "}
                          {formatDate(booking.engineerAssignment.workLog.startedAt)}
                        </p>
                      )}
                      {booking.engineerAssignment.workLog.completedAt && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Completed:</span>{" "}
                          {formatDate(booking.engineerAssignment.workLog.completedAt)}
                        </p>
                      )}
                      {booking.engineerAssignment.workLog.workNotes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Notes:</p>
                          <p className="text-sm">{booking.engineerAssignment.workLog.workNotes}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
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
                  {booking.paymentProof.imageUrl && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Payment Screenshot</p>
                      <img
                        src={booking.paymentProof.imageUrl}
                        alt="Payment proof"
                        className="rounded border max-h-48 w-full object-cover"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No payment uploaded yet</p>
                  {booking.status === "PENDING_PAYMENT" && (
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
                {booking.engineerAssignment?.assignedAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Engineer Assigned:</span>
                    <span>{formatDate(booking.engineerAssignment.assignedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
