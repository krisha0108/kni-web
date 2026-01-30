"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { Eye, Search, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/utils";

interface Booking {
  id: string;
  status: string;
  preferredDate: string;
  preferredTimeSlot: string;
  scheduledDate?: string;
  totalAmount: number;
  createdAt: string;
  restaurant: { id: string; name: string };
  owner: { id: string; name: string };
  paymentProof?: { status: string };
  engineerAssignments?: Array<{ engineer?: { name: string }; status: string }>;
  items?: Array<{
    serviceItem?: { category?: { id: string; name: string } };
    partItem?: { category?: { id: string; name: string } };
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

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const router = useRouter();

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch("/api/admin/bookings?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setBookings(data.data.items || data.data);
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
    fetchBookings();
  }, [search, statusFilter]);

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

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/exports/bookings");
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Bookings exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export bookings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Bookings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage all service bookings</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by restaurant or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <ClientOnly>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
              <SelectItem value="PAYMENT_UPLOADED">Payment Uploaded</SelectItem>
              <SelectItem value="PAYMENT_VERIFIED">Payment Verified</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </ClientOnly>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden md:table-cell">ID</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead className="hidden lg:table-cell">Categories</TableHead>
              <TableHead className="hidden sm:table-cell">Owner</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Engineer</TableHead>
              <TableHead className="w-[60px] sm:w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => {
                // Extract unique categories from items
                const categories = new Set<string>();
                booking.items?.forEach((item) => {
                  const categoryName = item.serviceItem?.category?.name || item.partItem?.category?.name;
                  if (categoryName) categories.add(categoryName);
                });
                const categoryList = Array.from(categories);

                return (
                  <TableRow key={booking.id}>
                    <TableCell className="hidden md:table-cell font-mono text-xs">
                      {booking.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-[120px] sm:max-w-none truncate">{booking.restaurant.name}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {categoryList.length > 0 ? (
                          categoryList.map((cat) => (
                            <Badge key={cat} variant="outline" className="text-xs">
                              {cat}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{booking.owner.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(booking.preferredDate)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatPrice(booking.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[booking.status] || "default"} className="text-xs whitespace-nowrap">
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {booking.engineerAssignments && booking.engineerAssignments.length > 0
                        ? booking.engineerAssignments[0]?.engineer?.name || "-"
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/admin/bookings/" + booking.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
