"use client";

import { useState, useEffect, useMemo } from "react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, Upload, Calendar, Building2, Search, Filter, X, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/utils";
import { ExportButton } from "@/components/export-button";
import { useRestaurant } from "@/contexts/restaurant-context";

interface Booking {
  id: string;
  status: string;
  slotStartDateTime: string;
  totalAmount: number;
  createdAt: string;
  restaurant: { id: string; name: string };
  items: Array<{
    id: string;
    qty: number;
    priceSnapshot: number;
    serviceItem?: { name: string };
    partItem?: { name: string };
  }>;
  paymentProof?: { status: string };
  engineerAssignments?: Array<{
    status: string;
    engineer?: { name: string };
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

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  const fetchBookings = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("restaurantId", selectedRestaurant.restaurantId);
      params.set("page", page.toString());
      params.set("pageSize", "20");
      const response = await fetch(`/api/owner/bookings?${params.toString()}`);
      const data = await response.json();
      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || data.total || 0;
        const pSize = data.data?.pageSize || 20;
        setBookings(Array.isArray(items) ? items : []);
        setTotalPages(data.totalPages || Math.ceil(total / pSize) || 1);
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
  }, [selectedRestaurant, page]);

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

  // Filtered and sorted bookings
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((booking) =>
        booking.id.toLowerCase().includes(query) ||
        booking.restaurant.name.toLowerCase().includes(query) ||
        getStatusLabel(booking.status).toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((booking) => booking.status === filterStatus);
    }

    // Date range filter
    if (filterDateFrom) {
      filtered = filtered.filter((booking) =>
        new Date(booking.slotStartDateTime) >= new Date(filterDateFrom)
      );
    }
    if (filterDateTo) {
      filtered = filtered.filter((booking) =>
        new Date(booking.slotStartDateTime) <= new Date(filterDateTo)
      );
    }

    // Amount range filter
    if (filterMinAmount) {
      filtered = filtered.filter((booking) =>
        booking.totalAmount >= parseFloat(filterMinAmount)
      );
    }
    if (filterMaxAmount) {
      filtered = filtered.filter((booking) =>
        booking.totalAmount <= parseFloat(filterMaxAmount)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.slotStartDateTime).getTime() - new Date(a.slotStartDateTime).getTime();
        case "date-asc":
          return new Date(a.slotStartDateTime).getTime() - new Date(b.slotStartDateTime).getTime();
        case "amount-desc":
          return b.totalAmount - a.totalAmount;
        case "amount-asc":
          return a.totalAmount - b.totalAmount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [bookings, searchQuery, filterStatus, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount, sortBy]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== "all") count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    if (filterMinAmount) count++;
    if (filterMaxAmount) count++;
    return count;
  }, [filterStatus, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount]);

  // Clear all filters
  const clearFilters = () => {
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterMinAmount("");
    setFilterMaxAmount("");
  };

  const userRole = selectedRestaurant?.role;
  const canCreate = userRole === "OWNER" || userRole === "MANAGER";
  const canUpdate = userRole === "OWNER" || userRole === "MANAGER";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground">View and manage your service bookings for {selectedRestaurant.restaurant.name}</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            endpoint="/api/owner/exports/bookings"
            filename={`my-bookings-${new Date().toISOString().split('T')[0]}.csv`}
          />
          {canCreate && <Button onClick={() => router.push("/owner/cart")}>
            <Calendar className="mr-2 h-4 w-4" />
            New Booking
          </Button>}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by booking ID, restaurant, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Button */}
            <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Filter Bookings</DialogTitle>
                  <DialogDescription>
                    Apply filters to narrow down your bookings
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="SLOT_SELECTED">Slot Selected</SelectItem>
                        <SelectItem value="PAYMENT_UPLOADED">Payment Uploaded</SelectItem>
                        <SelectItem value="PAYMENT_VERIFIED">Payment Verified</SelectItem>
                        <SelectItem value="PAYMENT_REJECTED">Payment Rejected</SelectItem>
                        <SelectItem value="ENGINEER_ASSIGNED">Engineer Assigned</SelectItem>
                        <SelectItem value="ACCEPTED_BY_ENGINEER">Engineer Accepted</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From Date</Label>
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>To Date</Label>
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Amount Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filterMinAmount}
                        onChange={(e) => setFilterMinAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="No limit"
                        value={filterMaxAmount}
                        onChange={(e) => setFilterMaxAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <Button onClick={() => setIsFilterDialogOpen(false)}>
                    Apply Filters
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || activeFiltersCount > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchQuery}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {filterStatus !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {getStatusLabel(filterStatus)}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilterStatus("all")}
                  />
                </Badge>
              )}
              {filterDateFrom && (
                <Badge variant="secondary" className="gap-1">
                  From: {filterDateFrom}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilterDateFrom("")}
                  />
                </Badge>
              )}
              {filterDateTo && (
                <Badge variant="secondary" className="gap-1">
                  To: {filterDateTo}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilterDateTo("")}
                  />
                </Badge>
              )}
              {filterMinAmount && (
                <Badge variant="secondary" className="gap-1">
                  Min: ₹{filterMinAmount}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilterMinAmount("")}
                  />
                </Badge>
              )}
              {filterMaxAmount && (
                <Badge variant="secondary" className="gap-1">
                  Max: ₹{filterMaxAmount}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilterMaxAmount("")}
                  />
                </Badge>
              )}
            </div>
          )}

          {/* Results Count */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredBookings.length} of {bookings.length} bookings
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading bookings...</p>
          </CardContent>
        </Card>
      ) : filteredBookings.length === 0 && bookings.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No bookings match your filters</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
            <Button className="mt-4" variant="outline" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No bookings yet</p>
            <p className="text-sm text-muted-foreground">Create your first booking from My Equipment</p>
            <Button className="mt-4" onClick={() => router.push("/owner/equipment")}>
              Go to My Equipment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden lg:table-cell">Booking ID</TableHead>
                <TableHead>Restaurant</TableHead>
                
                <TableHead className="hidden md:table-cell">Items</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Engineer</TableHead>
                
                <TableHead className="w-[80px] sm:w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                
                <TableRow key={booking.id}>
                  <TableCell className="hidden lg:table-cell font-mono text-sm">
                    {booking.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{booking.restaurant.name}</TableCell>
                  
                  <TableCell className="hidden md:table-cell">
                    {booking.items.length} item{booking.items.length !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(booking.slotStartDateTime)}</TableCell>
                  <TableCell>{formatPrice(booking.totalAmount)}</TableCell>
                  
                  <TableCell>
                    <Badge variant={statusColors[booking.status] || "default"}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="hidden md:table-cell">
                    {booking.engineerAssignments?.[0]?.engineer?.name || "-"}
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
                      {canUpdate && (booking.status === "SLOT_SELECTED" || booking.status === "PAYMENT_REJECTED") && (
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
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4 p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
        </div>
      )}
    </div>
  );
}