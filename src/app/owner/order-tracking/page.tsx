"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/contexts/restaurant-context";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Phone,
  User,
  Calendar,
  Building2,
  Wrench,
  ShoppingBag,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface ServiceBooking {
  id: string;
  status: string;
  slotStartDateTime: string | null;
  totalAmount: number;
  problemDescription: string | null;
  createdAt: string;
  equipment: { id: string; name: string } | null;
  engineerAssignments: Array<{
    status: string;
    engineer: { name: string; phone: string };
  }>;
}

interface MarketplacePayment {
  id: string;
  status: string; // PENDING | VERIFIED | REJECTED
  totalAmount: number;
  createdAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  screenshotUrl: string;
  deliveryAddress?: string;
  notes?: string;
  orderId?: string;
  items: Array<{ productId: string; qty: number; priceSnapshot: number; name: string }>;
  vendor: { id: string; name: string };
  restaurant: { id: string; name: string };
}

interface MarketplaceOrder {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  statusNotes?: string;
  cancellationReason?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  items: Array<{
    product: { name: string; unit?: string };
    qty: number;
    priceSnapshot: number;
  }>;
  vendor?: { name: string };
  statusHistory?: Array<{
    id: string;
    oldStatus: string | null;
    newStatus: string;
    notes: string | null;
    createdAt: string;
  }>;
}

// Unified tracking item: payment (pre-order) + order (post-verification)
interface TrackingItem {
  id: string; // payment ID
  payment: MarketplacePayment;
  order?: MarketplaceOrder;
  // Computed combined status for display
  combinedStatus: string;
  totalAmount: number;
  createdAt: string;
  vendorName: string;
  itemNames: string;
}

const SERVICE_STATUSES = [
  { value: "all", label: "All Status" },
  { value: "SLOT_SELECTED", label: "Slot Selected" },
  { value: "PAYMENT_UPLOADED", label: "Payment Uploaded" },
  { value: "PAYMENT_VERIFIED", label: "Payment Verified" },
  { value: "PAYMENT_REJECTED", label: "Payment Rejected" },
  { value: "ENGINEER_ASSIGNED", label: "Engineer Assigned" },
  { value: "ACCEPTED_BY_ENGINEER", label: "Engineer Accepted" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const ORDER_STATUSES = [
  { value: "all", label: "All Status" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "PAYMENT_REJECTED", label: "Payment Rejected" },
  { value: "PLACED", label: "Placed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const getServiceStatusConfig = (status: string) => {
  switch (status) {
    case "DRAFT":
      return { color: "secondary" as const, icon: Clock, label: "Draft" };
    case "SLOT_SELECTED":
      return { color: "warning" as const, icon: Calendar, label: "Slot Selected" };
    case "PAYMENT_UPLOADED":
      return { color: "secondary" as const, icon: Clock, label: "Payment Uploaded" };
    case "PAYMENT_VERIFIED":
      return { color: "success" as const, icon: CheckCircle, label: "Payment Verified" };
    case "PAYMENT_REJECTED":
      return { color: "destructive" as const, icon: XCircle, label: "Payment Rejected" };
    case "ENGINEER_ASSIGNED":
      return { color: "default" as const, icon: User, label: "Engineer Assigned" };
    case "ACCEPTED_BY_ENGINEER":
      return { color: "default" as const, icon: User, label: "Engineer Accepted" };
    case "IN_PROGRESS":
      return { color: "default" as const, icon: Wrench, label: "In Progress" };
    case "REJECTED_BY_ENGINEER":
      return { color: "destructive" as const, icon: XCircle, label: "Engineer Rejected" };
    case "COMPLETED":
      return { color: "success" as const, icon: CheckCircle, label: "Completed" };
    case "CANCELLED":
      return { color: "destructive" as const, icon: XCircle, label: "Cancelled" };
    default:
      return { color: "secondary" as const, icon: Clock, label: status };
  }
};

const getOrderStatusConfig = (status: string) => {
  switch (status) {
    case "PAYMENT_PENDING":
      return { color: "warning" as const, icon: Clock, label: "Payment Pending" };
    case "PAYMENT_REJECTED":
      return { color: "destructive" as const, icon: XCircle, label: "Payment Rejected" };
    case "PAYMENT_VERIFIED":
      return { color: "success" as const, icon: CheckCircle, label: "Payment Verified" };
    case "PLACED":
      return { color: "default" as const, icon: Package, label: "Placed" };
    case "CONFIRMED":
      return { color: "default" as const, icon: CheckCircle, label: "Confirmed" };
    case "PROCESSING":
      return { color: "default" as const, icon: Package, label: "Processing" };
    case "SHIPPED":
      return { color: "default" as const, icon: Truck, label: "Shipped" };
    case "DELIVERED":
      return { color: "success" as const, icon: CheckCircle, label: "Delivered" };
    case "CANCELLED":
      return { color: "destructive" as const, icon: XCircle, label: "Cancelled" };
    default:
      return { color: "secondary" as const, icon: Clock, label: status };
  }
};

const TimelineStep = ({
  title,
  description,
  date,
  isCompleted,
  isCurrent,
  isLast,
}: {
  title: string;
  description?: string;
  date?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isLast: boolean;
}) => (
  <div className="flex gap-3 sm:gap-4">
    <div className="flex flex-col items-center">
      <div
        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 ${
          isCompleted
            ? "bg-green-500 border-green-500"
            : isCurrent
            ? "bg-primary border-primary"
            : "bg-background border-muted"
        }`}
      />
      {!isLast && (
        <div
          className={`w-0.5 flex-1 min-h-[40px] sm:min-h-[50px] ${
            isCompleted ? "bg-green-500" : "bg-muted"
          }`}
        />
      )}
    </div>
    <div className="pb-6 sm:pb-8 min-w-0 flex-1">
      <p className={`font-medium text-xs sm:text-sm ${isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
        {title}
      </p>
      {description && <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{description}</p>}
      {date && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{formatDate(date)}</p>}
    </div>
  </div>
);

export default function OrderTrackingPage() {
  const [activeTab, setActiveTab] = useState("services");
  const [serviceBookings, setServiceBookings] = useState<ServiceBooking[]>([]);
  const [trackingItems, setTrackingItems] = useState<TrackingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceStatusFilter, setServiceStatusFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [selectedService, setSelectedService] = useState<ServiceBooking | null>(null);
  const [selectedTracking, setSelectedTracking] = useState<TrackingItem | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedRestaurant) {
      fetchData();
    }
  }, [selectedRestaurant, page]);

  const fetchData = async () => {
    if (!selectedRestaurant) return;

    setIsLoading(true);
    try {
      const [bookingsRes, ordersRes, paymentsRes] = await Promise.all([
        fetch(`/api/owner/bookings?restaurantId=${selectedRestaurant.restaurantId}&page=${page}&pageSize=20`),
        fetch(`/api/owner/marketplace/orders?restaurantId=${selectedRestaurant.restaurantId}&page=${page}&pageSize=20`),
        fetch(`/api/owner/marketplace/payments?restaurantId=${selectedRestaurant.restaurantId}&page=${page}&pageSize=20`),
      ]);

      const bookingsData = await bookingsRes.json();
      const ordersData = await ordersRes.json();
      const paymentsData = await paymentsRes.json();

      if (bookingsData.ok) {
        const bItems = bookingsData.data?.items || bookingsData.data;
        const bTotal = bookingsData.data?.total || 0;
        setServiceBookings(Array.isArray(bItems) ? bItems : []);
        setTotalPages(Math.ceil(bTotal / 20) || 1);
      }

      // Build unified tracking items: payment + linked order
      const paymentsRaw = paymentsData.ok ? (paymentsData.data?.items || paymentsData.data || []) : [];
      const ordersRaw = ordersData.ok ? (ordersData.data?.items || ordersData.data || []) : [];
      const payments: MarketplacePayment[] = Array.isArray(paymentsRaw) ? paymentsRaw : [];
      const orders: MarketplaceOrder[] = Array.isArray(ordersRaw) ? ordersRaw : [];
      const orderMap = new Map(orders.map((o) => [o.id, o]));
      const linkedOrderIds = new Set<string>();

      const items: TrackingItem[] = payments.map((payment) => {
        const order = payment.orderId ? orderMap.get(payment.orderId) : undefined;
        if (order) linkedOrderIds.add(order.id);

        let combinedStatus = "PAYMENT_PENDING";
        if (payment.status === "REJECTED") combinedStatus = "PAYMENT_REJECTED";
        else if (payment.status === "VERIFIED" && order) combinedStatus = order.status;
        else if (payment.status === "VERIFIED") combinedStatus = "PLACED";

        const itemNames = (payment.items || []).map((i: any) => i.name || "Product").join(", ");

        return {
          id: payment.id,
          payment,
          order,
          combinedStatus,
          totalAmount: payment.totalAmount,
          createdAt: payment.createdAt,
          vendorName: payment.vendor?.name || "Vendor",
          itemNames,
        };
      });

      // Add orders that have no linked payment (legacy orders)
      for (const order of orders) {
        if (!linkedOrderIds.has(order.id)) {
          const itemNames = (order.items || [])
            .map((i: any) => i.product?.name || i.product?.product?.name || "Product")
            .join(", ");
          items.push({
            id: order.id,
            payment: {
              id: order.id,
              status: "VERIFIED",
              totalAmount: order.totalAmount,
              createdAt: order.createdAt,
              screenshotUrl: "",
              items: order.items.map((i: any) => ({
                productId: i.product?.id || "",
                qty: i.qty,
                priceSnapshot: i.priceSnapshot,
                name: i.product?.name || i.product?.product?.name || "Product",
              })),
              vendor: order.vendor || { id: "", name: "Vendor" },
              restaurant: { id: "", name: "" },
            } as MarketplacePayment,
            order,
            combinedStatus: order.status,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
            vendorName: order.vendor?.name || "Vendor",
            itemNames,
          });
        }
      }

      // Sort by most recent first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTrackingItems(items);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tracking data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredServices = serviceBookings.filter((b) => {
    const matchesSearch = !searchQuery ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.equipment?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = serviceStatusFilter === "all" || b.status === serviceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOrders = trackingItems.filter((t) => {
    const matchesSearch = !searchQuery ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.itemNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = orderStatusFilter === "all" || t.combinedStatus === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getServiceTimeline = (booking: ServiceBooking) => {
    const isCancelled = booking.status === "CANCELLED";
    // Map status to step number (matching the 6-step service booking flow)
    const stepMap: Record<string, number> = {
      DRAFT: 0, SLOT_SELECTED: 0,
      PAYMENT_UPLOADED: 1, PAYMENT_REJECTED: 1,
      PAYMENT_VERIFIED: 2,
      ENGINEER_ASSIGNED: 3, ACCEPTED_BY_ENGINEER: 3, REJECTED_BY_ENGINEER: 3,
      IN_PROGRESS: 4,
      COMPLETED: 5,
    };
    const currentStep = stepMap[booking.status] ?? -1;

    return [
      { title: "Booked", description: "Service request created", date: booking.createdAt, step: 0 },
      { title: "Payment", description: booking.status === "PAYMENT_REJECTED" ? "Payment rejected — re-upload required" : "Payment uploaded", step: 1 },
      { title: "Verified", description: "Payment confirmed", step: 2 },
      { title: "Assigned", description: booking.engineerAssignments?.[0]?.engineer?.name ? `Engineer: ${booking.engineerAssignments[0].engineer.name}` : "Engineer assignment pending", step: 3 },
      { title: "In Progress", description: booking.slotStartDateTime ? `Slot: ${formatDate(booking.slotStartDateTime)}` : "Engineer working", step: 4 },
      { title: isCancelled ? "Cancelled" : "Completed", description: isCancelled ? "Service cancelled" : "Service completed", step: 5 },
    ].map((item, index, arr) => ({
      ...item,
      isCompleted: !isCancelled && currentStep > item.step,
      isCurrent: !isCancelled && currentStep === item.step,
      isLast: index === arr.length - 1,
    }));
  };

  const getTrackingTimeline = (tracking: TrackingItem) => {
    const { payment, order } = tracking;
    const isCancelled = order?.status === "CANCELLED";

    // 6-step flow: Payment → Verified → Confirmed → Processing → Shipped → Delivered
    let currentStep = -1;
    if (payment.status === "PENDING") currentStep = 0;
    else if (payment.status === "REJECTED") currentStep = 0;
    else if (payment.status === "VERIFIED" && !order) currentStep = 1;
    else if (payment.status === "VERIFIED" && order) {
      const orderStepMap: Record<string, number> = { PLACED: 2, CONFIRMED: 2, PROCESSING: 3, SHIPPED: 4, DELIVERED: 5 };
      currentStep = orderStepMap[order.status] ?? 2;
    }

    const isRejected = payment.status === "REJECTED";

    return [
      { title: "Payment Submitted", description: isRejected ? `Rejected: ${payment.rejectionReason || "Re-upload required"}` : "Payment screenshot uploaded", date: payment.createdAt, step: 0 },
      { title: "Payment Verified", description: "Vendor verified your payment", date: payment.verifiedAt, step: 1 },
      { title: "Order Confirmed", description: "Order created & confirmed", date: order?.createdAt, step: 2 },
      { title: "Processing", description: "Order being prepared", step: 3 },
      { title: "Shipped", description: "Order dispatched", step: 4 },
      { title: isCancelled ? "Cancelled" : "Delivered", description: isCancelled ? (order?.cancellationReason || "Order cancelled") : "Order delivered", date: order?.actualDeliveryDate, step: 5 },
    ].map((item, index, arr) => ({
      ...item,
      isCompleted: !isCancelled && !isRejected && currentStep > item.step,
      isCurrent: !isCancelled && currentStep === item.step,
      isLast: index === arr.length - 1,
    }));
  };

  if (!selectedRestaurant) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 sm:py-10">
              <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold">No Restaurant Selected</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1 text-center">
                Please select a restaurant to track orders
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Order Tracking</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track your service bookings and marketplace orders</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 scrollbar-hide">
          <div className="px-4 sm:px-0 min-w-min">
            <TabsList className="grid w-full max-w-md grid-cols-2 inline-flex">
              <TabsTrigger value="services" className="gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Service Bookings
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Marketplace Orders
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Service Bookings Tab */}
        <TabsContent value="services" className="space-y-3 sm:space-y-4">
          <Card>
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID or equipment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-9 h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <Select value={serviceStatusFilter} onValueChange={setServiceStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs sm:text-sm">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Card>
              <CardContent className="py-8 sm:py-10">
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : filteredServices.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-10">
                <div className="flex flex-col items-center justify-center">
                  <Wrench className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold">No Service Bookings</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">No bookings match your criteria</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredServices.map((booking) => {
                const statusConfig = getServiceStatusConfig(booking.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <Card
                    key={booking.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedService(booking)}
                  >
                    <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant={statusConfig.color} className="gap-1 text-xs shrink-0">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">#{booking.id.slice(0, 8)}</span>
                          </div>
                          <h3 className="font-semibold text-sm sm:text-base">{booking.equipment?.name || "General Service"}</h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="truncate">{booking.slotStartDateTime ? formatDate(booking.slotStartDateTime) : "Not scheduled"}</span>
                            </div>
                            <div className="font-medium text-foreground">{formatPrice(booking.totalAmount)}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Marketplace Orders Tab */}
        <TabsContent value="orders" className="space-y-3 sm:space-y-4">
          <Card>
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-9 h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs sm:text-sm">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Card>
              <CardContent className="py-8 sm:py-10">
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-10">
                <div className="flex flex-col items-center justify-center">
                  <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold">No Marketplace Orders</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">No orders match your criteria</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredOrders.map((tracking) => {
                const statusConfig = getOrderStatusConfig(tracking.combinedStatus);
                const StatusIcon = statusConfig.icon;
                return (
                  <Card
                    key={tracking.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTracking(tracking)}
                  >
                    <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant={statusConfig.color} className="gap-1 text-xs shrink-0">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">#{tracking.id.slice(0, 8)}</span>
                          </div>
                          <h3 className="font-semibold text-sm sm:text-base truncate">
                            {tracking.itemNames || `${tracking.payment.items?.length || 0} item(s)`}
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="truncate">{tracking.vendorName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="truncate">{formatDate(tracking.createdAt)}</span>
                            </div>
                            <div className="font-medium text-foreground">{formatPrice(tracking.totalAmount)}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4 p-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}

      {/* Service Detail Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Service Booking #{selectedService?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4 sm:space-y-6">
              <div className="p-3 sm:p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-sm sm:text-base">{selectedService.equipment?.name || "General Service"}</h3>
                {selectedService.problemDescription && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{selectedService.problemDescription}</p>
                )}
                <p className="text-base sm:text-lg font-bold mt-2 leading-tight break-all">{formatPrice(selectedService.totalAmount)}</p>
              </div>

              {selectedService.engineerAssignments?.[0] && (
                <div className="p-3 sm:p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{selectedService.engineerAssignments[0].engineer.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{selectedService.engineerAssignments[0].engineer.phone}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-sm sm:text-base mb-3 sm:mb-4">Tracking Timeline</h4>
                <div className="ml-2">
                  {getServiceTimeline(selectedService).map((step, index) => (
                    <TimelineStep key={index} {...step} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedTracking} onOpenChange={() => setSelectedTracking(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Order #{selectedTracking?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedTracking && (
            <div className="space-y-4 sm:space-y-6">
              {/* Vendor Info */}
              <div className="p-3 sm:p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{selectedTracking.vendorName}</p>
                    <p className="text-xs text-muted-foreground">Vendor</p>
                  </div>
                  <Badge variant={getOrderStatusConfig(selectedTracking.combinedStatus).color} className="text-xs shrink-0">
                    {getOrderStatusConfig(selectedTracking.combinedStatus).label}
                  </Badge>
                </div>
              </div>

              {/* Items */}
              <div className="p-3 sm:p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-sm sm:text-base">{selectedTracking.payment.items?.length || 0} Item(s)</h3>
                {selectedTracking.payment.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-xs sm:text-sm mt-2">
                    <span className="truncate mr-2">{item.name || "Product"} x {item.qty}</span>
                    <span className="shrink-0">{formatPrice(item.priceSnapshot * item.qty)}</span>
                  </div>
                ))}
                <div className="border-t mt-2 pt-2">
                  <div className="flex justify-between font-bold text-sm sm:text-base">
                    <span>Total</span>
                    <span className="break-all leading-tight">{formatPrice(selectedTracking.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Rejection Warning */}
              {selectedTracking.payment.status === "REJECTED" && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Payment Rejected</p>
                      <p className="text-xs text-red-600 mt-1">{selectedTracking.payment.rejectionReason || "Please re-upload payment screenshot"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Timeline */}
              <div>
                <h4 className="font-medium text-sm sm:text-base mb-3 sm:mb-4">Order Journey</h4>
                <div className="ml-2">
                  {getTrackingTimeline(selectedTracking).map((step, index) => (
                    <TimelineStep key={index} {...step} />
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