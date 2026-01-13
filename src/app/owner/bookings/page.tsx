"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Eye, Upload, Calendar, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/utils";
import { ExportButton } from "@/components/export-button";
import { useRestaurant } from "@/contexts/restaurant-context";

interface Booking {
  id: string;
  status: string;
  preferredDate: string;
  preferredTimeSlot: string;
  totalAmount: number;
  createdAt: string;
  restaurant: { id: string; name: string };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    serviceItem?: { name: string };
    partItem?: { name: string };
  }>;
  paymentProof?: { status: string };
  engineerAssignment?: {
    status: string;
    engineer?: { name: string };
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

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();

  const fetchBookings = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/owner/bookings?restaurantId=${selectedRestaurant.restaurantId}`);
      const data = await response.json();
      if (data.ok) {
        setBookings(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch bookings",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRestaurant) {
      fetchBookings();
    }
  }, [selectedRestaurant]);

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

  if (!selectedRestaurant) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Please select a restaurant</p>
          <p className="text-sm text-muted-foreground mt-2">Use the restaurant switcher in the header to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground">View and manage your service bookings for {selectedRestaurant.restaurant.name}</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            endpoint="/api/owner/exports/bookings"
            filename={`my-bookings-${new Date().toISOString().split('T')[0]}.csv`}
          />
          <Button onClick={() => router.push("/owner/cart")}>
            <Calendar className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading bookings...</p>
          </CardContent>
        </Card>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No bookings yet</p>
            <p className="text-sm text-muted-foreground">Create your first booking from the feed</p>
            <Button className="mt-4" onClick={() => router.push("/owner/feed")}>
              Browse Services
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Preferred Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engineer</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono text-sm">
                    {booking.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{booking.restaurant.name}</TableCell>
                  <TableCell>
                    {booking.items.length} item{booking.items.length !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell>{formatDate(booking.preferredDate)}</TableCell>
                  <TableCell>{formatPrice(booking.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[booking.status] || "default"}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {booking.engineerAssignment?.engineer?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/owner/bookings/" + booking.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {booking.status === "PENDING_PAYMENT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push("/owner/bookings/" + booking.id + "/payment")}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
