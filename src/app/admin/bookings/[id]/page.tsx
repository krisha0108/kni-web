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
import { ArrowLeft, MapPin, Calendar, User, CheckCircle, XCircle, UserPlus } from "lucide-react";
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
  owner: { id: string; name: string; phone: string };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    serviceItem?: { name: string };
    partItem?: { name: string };
  }>;
  paymentProof?: { id: string; imageUrl: string; status: string };
  engineerAssignment?: {
    id: string;
    status: string;
    engineer?: { id: string; name: string };
  };
}

interface Engineer {
  id: string;
  name: string;
  phone: string;
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
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState("");
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
        if (data.data.preferredDate) {
          setScheduledDate(data.data.scheduledDate || data.data.preferredDate.split("T")[0]);
        }
        if (data.data.preferredTimeSlot) {
          setScheduledTimeSlot(data.data.scheduledTimeSlot || data.data.preferredTimeSlot);
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

  const fetchEngineers = async () => {
    try {
      const response = await fetch("/api/admin/engineers");
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

  const handleVerifyPayment = async (approve: boolean) => {
    setIsVerifying(true);
    try {
      const response = await fetch("/api/admin/bookings/" + bookingId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: approve ? "verify_payment" : "reject_payment",
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: approve ? "Payment verified" : "Payment rejected" });
        fetchBooking();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update payment", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAssignEngineer = async () => {
    if (!selectedEngineer) {
      toast({ title: "Error", description: "Please select an engineer", variant: "destructive" });
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

    setIsAssigning(true);
    try {
      const response = await fetch("/api/admin/bookings/" + bookingId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_engineer",
          engineerId: selectedEngineer,
          scheduledDate,
          scheduledTimeSlot,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Engineer assigned" });
        setIsAssignOpen(false);
        fetchBooking();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to assign engineer", variant: "destructive" });
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
  const canAssignEngineer = booking.status === "PAYMENT_VERIFIED" && !booking.engineerAssignment;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/admin/bookings")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Bookings
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Booking Details</h1>
          <p className="text-muted-foreground font-mono">{booking.id}</p>
        </div>
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

          {/* Schedule */}
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
                {booking.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{item.serviceItem?.name || item.partItem?.name}</span>
                      <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(booking.totalAmount)}</span>
                </div>
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
                  {booking.paymentProof.imageUrl && (
                    <img
                      src={booking.paymentProof.imageUrl}
                      alt="Payment proof"
                      className="rounded border max-h-48 w-full object-cover cursor-pointer"
                      onClick={() => window.open(booking.paymentProof!.imageUrl, "_blank")}
                    />
                  )}
                  {canVerifyPayment && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleVerifyPayment(true)}
                        disabled={isVerifying}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Verify
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleVerifyPayment(false)}
                        disabled={isVerifying}
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
              {booking.engineerAssignment ? (
                <>
                  <div>
                    <p className="font-medium">{booking.engineerAssignment.engineer?.name}</p>
                    <Badge>{booking.engineerAssignment.status}</Badge>
                  </div>
                </>
              ) : canAssignEngineer ? (
                <Button className="w-full" onClick={() => setIsAssignOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign Engineer
                </Button>
              ) : (
                <p className="text-muted-foreground">
                  {booking.status === "PAYMENT_VERIFIED"
                    ? "Ready to assign engineer"
                    : "Payment verification required first"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Engineer Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Engineer</DialogTitle>
            <DialogDescription>
              Select an engineer and confirm the schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="engineer">Engineer *</Label>
              <Select value={selectedEngineer} onValueChange={setSelectedEngineer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select engineer" />
                </SelectTrigger>
                <SelectContent>
                  {engineers.map((eng) => (
                    <SelectItem key={eng.id} value={eng.id}>
                      {eng.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
    </div>
  );
}
