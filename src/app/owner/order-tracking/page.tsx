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

interface MarketplaceOrder {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    product: { name: string };
    quantity: number;
    price: number;
  }>;
  vendor?: { name: string };
}

const SERVICE_STATUSES = [
  { value: "all", label: "All Status" },
  { value: "PENDING_PAYMENT", label: "Pending Payment" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const ORDER_STATUSES = [
  { value: "all", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const getServiceStatusConfig = (status: string) => {
  switch (status) {
    case "PENDING_PAYMENT":
      return { color: "warning" as const, icon: Clock, label: "Pending Payment" };
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

const getOrderStatusConfig = (status: string) => {
  switch (status) {
    case "PENDING":
      return { color: "warning" as const, icon: Clock, label: "Pending" };
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
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div
        className={`w-4 h-4 rounded-full border-2 ${
          isCompleted
            ? "bg-green-500 border-green-500"
            : isCurrent
            ? "bg-primary border-primary"
            : "bg-background border-muted"
        }`}
      />
      {!isLast && (
        <div
          className={`w-0.5 flex-1 min-h-[50px] ${
            isCompleted ? "bg-green-500" : "bg-muted"
          }`}
        />
      )}
    </div>
    <div className="pb-8">
      <p className={`font-medium ${isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
        {title}
      </p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {date && <p className="text-xs text-muted-foreground mt-1">{formatDate(date)}</p>}
    </div>
  </div>
);

export default function OrderTrackingPage() {
  const [activeTab, setActiveTab] = useState("services");
  const [serviceBookings, setServiceBookings] = useState<ServiceBooking[]>([]);
  const [marketplaceOrders, setMarketplaceOrders] = useState<MarketplaceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceStatusFilter, setServiceStatusFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [selectedService, setSelectedService] = useState<ServiceBooking | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null);
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedRestaurant) {
      fetchData();
    }
  }, [selectedRestaurant]);

  const fetchData = async () => {
    if (!selectedRestaurant) return;

    setIsLoading(true);
    try {
      const [bookingsRes, ordersRes] = await Promise.all([
        fetch(`/api/owner/bookings?restaurantId=${selectedRestaurant.restaurantId}`),
        fetch(`/api/owner/marketplace/orders?restaurantId=${selectedRestaurant.restaurantId}`),
      ]);

      const bookingsData = await bookingsRes.json();
      const ordersData = await ordersRes.json();

      if (bookingsData.ok) {
        setServiceBookings(bookingsData.data || []);
      }
      if (ordersData.ok) {
        setMarketplaceOrders(ordersData.data || []);
      }
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

  const filteredOrders = marketplaceOrders.filter((o) => {
    const matchesSearch = !searchQuery ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getServiceTimeline = (booking: ServiceBooking) => {
    const statusOrder = ["PENDING_PAYMENT", "PAYMENT_VERIFIED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"];
    const currentIndex = statusOrder.indexOf(booking.status);
    const isCancelled = booking.status === "CANCELLED";

    return [
      { title: "Order Placed", description: "Service request created", date: booking.createdAt, step: 0 },
      { title: "Payment Verified", description: "Payment confirmed", step: 1 },
      { title: "Scheduled", description: booking.slotStartDateTime ? `Scheduled for ${formatDate(booking.slotStartDateTime)}` : "Pending scheduling", step: 2 },
      { title: "In Progress", description: booking.engineerAssignments?.[0]?.engineer?.name ? `Assigned to ${booking.engineerAssignments[0].engineer.name}` : "Engineer working", step: 3 },
      { title: isCancelled ? "Cancelled" : "Completed", description: isCancelled ? "Service cancelled" : "Service completed", step: 4 },
    ].map((item, index, arr) => ({
      ...item,
      isCompleted: !isCancelled && currentIndex >= item.step,
      isCurrent: !isCancelled && currentIndex === item.step,
      isLast: index === arr.length - 1,
    }));
  };

  const getOrderTimeline = (order: MarketplaceOrder) => {
    const statusOrder = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
    const currentIndex = statusOrder.indexOf(order.status);
    const isCancelled = order.status === "CANCELLED";

    return [
      { title: "Order Placed", description: "Order submitted", date: order.createdAt, step: 0 },
      { title: "Confirmed", description: "Order confirmed by vendor", step: 1 },
      { title: "Processing", description: "Order being prepared", step: 2 },
      { title: "Shipped", description: "Order dispatched", step: 3 },
      { title: isCancelled ? "Cancelled" : "Delivered", description: isCancelled ? "Order cancelled" : "Order delivered", step: 4 },
    ].map((item, index, arr) => ({
      ...item,
      isCompleted: !isCancelled && currentIndex >= item.step,
      isCurrent: !isCancelled && currentIndex === item.step,
      isLast: index === arr.length - 1,
    }));
  };

  if (!selectedRestaurant) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-10">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Restaurant Selected</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Please select a restaurant to track orders
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
          <h1 className="text-2xl font-bold">Order Tracking</h1>
          <p className="text-muted-foreground">Track your service bookings and marketplace orders</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="services" className="gap-2">
            <Wrench className="h-4 w-4" />
            Service Bookings
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Marketplace Orders
          </TabsTrigger>
        </TabsList>

        {/* Service Bookings Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID or equipment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={serviceStatusFilter} onValueChange={setServiceStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Card>
              <CardContent className="py-10">
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : filteredServices.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <div className="flex flex-col items-center justify-center">
                  <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Service Bookings</h3>
                  <p className="text-muted-foreground text-sm">No bookings match your criteria</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredServices.map((booking) => {
                const statusConfig = getServiceStatusConfig(booking.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <Card
                    key={booking.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedService(booking)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={statusConfig.color} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">#{booking.id.slice(0, 8)}</span>
                          </div>
                          <h3 className="font-semibold">{booking.equipment?.name || "General Service"}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {booking.slotStartDateTime ? formatDate(booking.slotStartDateTime) : "Not scheduled"}
                            </div>
                            <div className="font-medium text-foreground">{formatPrice(booking.totalAmount)}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Marketplace Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Card>
              <CardContent className="py-10">
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <div className="flex flex-col items-center justify-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Marketplace Orders</h3>
                  <p className="text-muted-foreground text-sm">No orders match your criteria</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const statusConfig = getOrderStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <Card
                    key={order.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={statusConfig.color} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                          </div>
                          <h3 className="font-semibold">
                            {order.items?.length || 0} item(s)
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(order.createdAt)}
                            </div>
                            <div className="font-medium text-foreground">{formatPrice(order.totalAmount)}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Service Detail Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Booking #{selectedService?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">{selectedService.equipment?.name || "General Service"}</h3>
                {selectedService.problemDescription && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedService.problemDescription}</p>
                )}
                <p className="text-lg font-bold mt-2">{formatPrice(selectedService.totalAmount)}</p>
              </div>

              {selectedService.engineerAssignments?.[0] && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedService.engineerAssignments[0].engineer.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedService.engineerAssignments[0].engineer.phone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-4">Tracking Timeline</h4>
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
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">{selectedOrder.items?.length || 0} Item(s)</h3>
                {selectedOrder.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm mt-2">
                    <span>{item.product?.name} x {item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t mt-2 pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4">Delivery Timeline</h4>
                <div className="ml-2">
                  {getOrderTimeline(selectedOrder).map((step, index) => (
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
