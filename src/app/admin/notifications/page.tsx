"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import {
  Bell, Search, CheckCircle, AlertCircle,
  Clock, Eye, CheckCheck, Trash2, BellOff,
  Package, Megaphone, Settings, CreditCard,
  Building2, ShoppingCart
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "BOOKING" | "PAYMENT" | "ORDER" | "AMC" | "EQUIPMENT" | "SYSTEM" | "ANNOUNCEMENT";
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

const TYPE_CONFIG = {
  BOOKING: { icon: Building2, color: "bg-blue-100 text-blue-600", badge: "default" as const, label: "Booking" },
  PAYMENT: { icon: CreditCard, color: "bg-green-100 text-green-600", badge: "success" as const, label: "Payment" },
  ORDER: { icon: ShoppingCart, color: "bg-purple-100 text-purple-600", badge: "secondary" as const, label: "Order" },
  AMC: { icon: CheckCircle, color: "bg-emerald-100 text-emerald-600", badge: "success" as const, label: "AMC" },
  EQUIPMENT: { icon: Package, color: "bg-orange-100 text-orange-600", badge: "warning" as const, label: "Equipment" },
  SYSTEM: { icon: Bell, color: "bg-gray-100 text-gray-600", badge: "outline" as const, label: "System" },
  ANNOUNCEMENT: { icon: Megaphone, color: "bg-yellow-100 text-yellow-600", badge: "warning" as const, label: "Announcement" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All Notifications" },
  { value: "unread", label: "Unread Only" },
  { value: "BOOKING", label: "Bookings" },
  { value: "PAYMENT", label: "Payments" },
  { value: "ORDER", label: "Orders" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "SYSTEM", label: "System" },
  { value: "ANNOUNCEMENT", label: "Announcements" },
];

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/notifications?page=${page}&pageSize=20`);

      if (!response.ok) {
        setNotifications([]);
        return;
      }

      const data = await response.json();

      if (data.ok && data.data) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setNotifications(items);
        setTotalPages(Math.ceil(total / 20) || 1);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast({ title: "Success", description: "All notifications marked as read" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to mark all as read", variant: "destructive" });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast({ title: "Success", description: "Notification deleted" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete notification", variant: "destructive" });
    }
  };

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (filter === "unread") {
      filtered = filtered.filter(n => !n.isRead);
    } else if (filter !== "all") {
      filtered = filtered.filter(n => n.type === filter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        n => n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, filter, searchQuery]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const bookingCount = notifications.filter(n => n.type === "BOOKING").length;
  const paymentCount = notifications.filter(n => n.type === "PAYMENT").length;

  const openNotification = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailOpen(true);
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Stay updated with bookings, payments, and system alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bookingCount}</p>
                <p className="text-xs text-muted-foreground">Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paymentCount}</p>
                <p className="text-xs text-muted-foreground">Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>All Notifications ({filteredNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Notifications</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {filter !== "all" ? "Try changing the filter" : "You're all caught up!"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.SYSTEM;
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      !notification.isRead ? "bg-primary/5 border-primary/20" : ""
                    }`}
                    onClick={() => openNotification(notification)}
                  >
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={config.badge}>{config.label}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openNotification(notification)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteNotification(notification.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4 p-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}

      {/* Notification Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && (
                <>
                  {(() => {
                    const config = TYPE_CONFIG[selectedNotification.type] || TYPE_CONFIG.SYSTEM;
                    const Icon = config.icon;
                    return (
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    );
                  })()}
                  {selectedNotification.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{selectedNotification.message}</p>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <Badge variant={TYPE_CONFIG[selectedNotification.type]?.badge || "default"}>
                  {TYPE_CONFIG[selectedNotification.type]?.label || selectedNotification.type}
                </Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDate(selectedNotification.createdAt)}
                </span>
              </div>
              {selectedNotification.linkUrl && (
                <Button className="w-full" asChild>
                  <a href={selectedNotification.linkUrl}>View Details</a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notification Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[600px] w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Settings
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <NotificationSettings />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}