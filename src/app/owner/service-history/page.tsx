"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/contexts/restaurant-context";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wrench,
  User,
  Building2,
  ChevronRight,
  Filter,
} from "lucide-react";

interface ServiceBooking {
  id: string;
  status: string;
  slotStartDateTime: string | null;
  slotEndDateTime: string | null;
  totalAmount: number;
  problemDescription: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: {
    id: string;
    name: string;
  };
  equipment: {
    id: string;
    name: string;
    category: string;
  } | null;
  items: Array<{
    id: string;
    qty: number;
    priceSnapshot: number;
    serviceItem?: { name: string };
    partItem?: { name: string };
  }>;
  engineerAssignments: Array<{
    id: string;
    status: string;
    assignedAt: string;
    engineer: {
      name: string;
      phone: string;
    };
  }>;
  paymentProof?: {
    status: string;
    screenshotUrl: string;
  };
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_PAYMENT", label: "Pending Payment" },
  { value: "PAYMENT_UPLOADED", label: "Payment Uploaded" },
  { value: "PAYMENT_VERIFIED", label: "Payment Verified" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case "DRAFT":
      return { color: "secondary" as const, icon: Clock, label: "Draft" };
    case "PENDING_PAYMENT":
      return { color: "warning" as const, icon: AlertCircle, label: "Pending Payment" };
    case "PAYMENT_UPLOADED":
      return { color: "secondary" as const, icon: Clock, label: "Payment Uploaded" };
    case "PAYMENT_VERIFIED":
      return { color: "success" as const, icon: CheckCircle, label: "Payment Verified" };
    case "SCHEDULED":
      return { color: "default" as const, icon: Calendar, label: "Scheduled" };
    case "IN_PROGRESS":
      return { color: "default" as const, icon: Wrench, label: "In Progress" };
    case "COMPLETED":
      return { color: "success" as const, icon: CheckCircle, label: "Completed" };
    case "CANCELLED":
      return { color: "destructive" as const, icon: XCircle, label: "Cancelled" };
    default:
      return { color: "secondary" as const, icon: Clock, label: status };
  }
};

const TimelineItem = ({
  title,
  description,
  date,
  isCompleted,
  isLast,
}: {
  title: string;
  description?: string;
  date?: string;
  isCompleted: boolean;
  isLast: boolean;
}) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div
        className={`w-3 h-3 rounded-full ${
          isCompleted ? "bg-green-500" : "bg-gray-300"
        }`}
      />
      {!isLast && (
        <div
          className={`w-0.5 flex-1 min-h-[40px] ${
            isCompleted ? "bg-green-500" : "bg-gray-200"
          }`}
        />
      )}
    </div>
    <div className="pb-6">
      <p className={`font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
        {title}
      </p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {date && (
        <p className="text-xs text-muted-foreground mt-1">{formatDate(date)}</p>
      )}
    </div>
  </div>
);

export default function ServiceHistoryPage() {
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<ServiceBooking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedRestaurant) {
      fetchBookings();
    }
  }, [selectedRestaurant, statusFilter]);

  const fetchBookings = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        restaurantId: selectedRestaurant.restaurantId,
      });
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/owner/bookings?${params.toString()}`);
      const data = await response.json();
      if (data.ok) {
        setBookings(data.data || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch service history",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch service history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    if (!searchQuery) return bookings;
    const query = searchQuery.toLowerCase();
    return bookings.filter(
      (b) =>
        b.id.toLowerCase().includes(query) ||
        b.equipment?.name.toLowerCase().includes(query) ||
        b.problemDescription?.toLowerCase().includes(query) ||
        b.restaurant.name.toLowerCase().includes(query)
    );
  }, [bookings, searchQuery]);

  const openDetail = (booking: ServiceBooking) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
  };

  const getTimelineSteps = (booking: ServiceBooking) => {
    const statusOrder = [
      "DRAFT",
      "PENDING_PAYMENT",
      "PAYMENT_UPLOADED",
      "PAYMENT_VERIFIED",
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
    ];

    const currentIndex = statusOrder.indexOf(booking.status);
    const isCancelled = booking.status === "CANCELLED";

    return [
      {
        title: "Booking Created",
        description: "Service request submitted",
        date: booking.createdAt,
        isCompleted: true,
      },
      {
        title: "Payment",
        description: booking.paymentProof
          ? `Payment ${booking.paymentProof.status.toLowerCase()}`
          : "Awaiting payment",
        date: booking.paymentProof ? booking.updatedAt : undefined,
        isCompleted: currentIndex >= 2 || isCancelled,
      },
      {
        title: "Scheduled",
        description: booking.slotStartDateTime
          ? `Scheduled for ${formatDate(booking.slotStartDateTime)}`
          : "Pending scheduling",
        date: booking.slotStartDateTime || undefined,
        isCompleted: currentIndex >= 4,
      },
      {
        title: "Engineer Assigned",
        description:
          booking.engineerAssignments.length > 0
            ? `Assigned to ${booking.engineerAssignments[0].engineer.name}`
            : "Pending assignment",
        date:
          booking.engineerAssignments.length > 0
            ? booking.engineerAssignments[0].assignedAt
            : undefined,
        isCompleted: booking.engineerAssignments.length > 0,
      },
      {
        title: "In Progress",
        description: "Service work in progress",
        isCompleted: currentIndex >= 5,
      },
      {
        title: isCancelled ? "Cancelled" : "Completed",
        description: isCancelled
          ? "Service was cancelled"
          : "Service completed successfully",
        date: isCancelled || currentIndex >= 6 ? booking.updatedAt : undefined,
        isCompleted: currentIndex >= 6 || isCancelled,
      },
    ];
  };

  // Status summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    return counts;
  }, [bookings]);

  if (!selectedRestaurant) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-10">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Restaurant Selected</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Please select a restaurant to view service history
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Service History</h1>
          <p className="text-muted-foreground">
            Track all your service requests and their progress
          </p>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusFilter === "all" ? "bg-primary/10" : "bg-muted"}`}>
                <Filter className={`h-5 w-5 ${statusFilter === "all" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{bookings.length}</p>
                <p className="text-xs text-muted-foreground">All Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("IN_PROGRESS")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusFilter === "IN_PROGRESS" ? "bg-primary/10" : "bg-muted"}`}>
                <Wrench className={`h-5 w-5 ${statusFilter === "IN_PROGRESS" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts["IN_PROGRESS"] || 0}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("SCHEDULED")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusFilter === "SCHEDULED" ? "bg-primary/10" : "bg-muted"}`}>
                <Calendar className={`h-5 w-5 ${statusFilter === "SCHEDULED" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts["SCHEDULED"] || 0}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("COMPLETED")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusFilter === "COMPLETED" ? "bg-primary/10" : "bg-muted"}`}>
                <CheckCircle className={`h-5 w-5 ${statusFilter === "COMPLETED" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts["COMPLETED"] || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, equipment, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Service History List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading service history...</p>
            </CardContent>
          </Card>
        ) : filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="flex flex-col items-center justify-center">
                <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Service Requests Found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {statusFilter !== "all"
                    ? "Try changing the filter"
                    : "You haven't made any service requests yet"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking) => {
            const statusConfig = getStatusConfig(booking.status);
            const StatusIcon = statusConfig.icon;
            return (
              <Card
                key={booking.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(booking)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={statusConfig.color} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          #{booking.id.slice(0, 8)}
                        </span>
                      </div>
                      <h3 className="font-semibold">
                        {booking.equipment?.name || "General Service"}
                      </h3>
                      {booking.problemDescription && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {booking.problemDescription}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {booking.slotStartDateTime
                            ? formatDate(booking.slotStartDateTime)
                            : "Not scheduled"}
                        </div>
                        {booking.engineerAssignments.length > 0 && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {booking.engineerAssignments[0].engineer.name}
                          </div>
                        )}
                        <div className="font-medium text-foreground">
                          {formatPrice(booking.totalAmount)}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Dialog with Timeline */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Service Request #{selectedBooking?.id.slice(0, 8)}</span>
              {selectedBooking && (
                <Badge variant={getStatusConfig(selectedBooking.status).color}>
                  {getStatusConfig(selectedBooking.status).label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              {/* Service Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-semibold">
                  {selectedBooking.equipment?.name || "General Service"}
                </h3>
                {selectedBooking.equipment?.category && (
                  <p className="text-sm text-muted-foreground">
                    Category: {selectedBooking.equipment.category}
                  </p>
                )}
                {selectedBooking.problemDescription && (
                  <p className="text-sm">{selectedBooking.problemDescription}</p>
                )}
                <div className="flex justify-between text-sm pt-2 border-t mt-2">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">
                    {formatPrice(selectedBooking.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Items */}
              {selectedBooking.items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Service Items</h4>
                  <div className="space-y-2">
                    {selectedBooking.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm p-2 bg-muted/50 rounded"
                      >
                        <span>
                          {item.serviceItem?.name || item.partItem?.name || "Item"} x{" "}
                          {item.qty}
                        </span>
                        <span>{formatPrice(item.priceSnapshot * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Engineer Info */}
              {selectedBooking.engineerAssignments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Assigned Engineer</h4>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {selectedBooking.engineerAssignments[0].engineer.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedBooking.engineerAssignments[0].engineer.phone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h4 className="font-medium mb-4">Service Timeline</h4>
                <div className="ml-2">
                  {getTimelineSteps(selectedBooking).map((step, index, arr) => (
                    <TimelineItem
                      key={index}
                      {...step}
                      isLast={index === arr.length - 1}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
