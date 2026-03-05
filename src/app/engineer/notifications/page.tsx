"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Search, CheckCircle, AlertCircle,
  Wrench, Clock, Eye, CheckCheck, Trash2, BellOff, Wallet,
  Package, Megaphone
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
  BOOKING: { icon: Wrench, color: "bg-blue-100 text-blue-600", badge: "default" as const, label: "Job" },
  PAYMENT: { icon: Wallet, color: "bg-green-100 text-green-600", badge: "success" as const, label: "Payout" },
  ORDER: { icon: Package, color: "bg-purple-100 text-purple-600", badge: "secondary" as const, label: "Order" },
  AMC: { icon: CheckCircle, color: "bg-emerald-100 text-emerald-600", badge: "success" as const, label: "AMC" },
  EQUIPMENT: { icon: Wrench, color: "bg-orange-100 text-orange-600", badge: "warning" as const, label: "Equipment" },
  SYSTEM: { icon: Bell, color: "bg-gray-100 text-gray-600", badge: "outline" as const, label: "System" },
  ANNOUNCEMENT: { icon: Megaphone, color: "bg-yellow-100 text-yellow-600", badge: "warning" as const, label: "Announcement" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All Notifications" },
  { value: "unread", label: "Unread Only" },
  { value: "BOOKING", label: "Jobs" },
  { value: "PAYMENT", label: "Payouts" },
  { value: "ORDER", label: "Orders" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "SYSTEM", label: "System" },
  { value: "ANNOUNCEMENT", label: "Announcements" },
];

export default function EngineerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notifications?limit=100");

      if (!response.ok) {
        setNotifications([]);
        return;
      }

      const data = await response.json();

      if (data.ok && data.data) {
        setNotifications(data.data.items || []);
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
  const jobCount = notifications.filter(n => n.type === "BOOKING").length;
  const payoutCount = notifications.filter(n => n.type === "PAYMENT").length;

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs sm:text-sm">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Stay updated with your job assignments, payouts, and system alerts
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="h-9 sm:h-10 text-xs sm:text-sm">
            <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{notifications.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-red-100 flex-shrink-0">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{jobCount}</p>
                <p className="text-xs text-muted-foreground">Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-green-100 flex-shrink-0">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold">{payoutCount}</p>
                <p className="text-xs text-muted-foreground">Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-3 sm:pt-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm">
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
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <BellOff className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold">No Notifications</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                {filter !== "all" ? "Try changing the filter" : "You're all caught up!"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredNotifications.map((notification) => {
                const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.SYSTEM;
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      !notification.isRead ? "bg-primary/5 border-primary/20" : ""
                    }`}
                    onClick={() => openNotification(notification)}
                  >
                    <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}>
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm sm:text-base font-medium truncate ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant={config.badge} className="text-xs">{config.label}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => openNotification(notification)}>
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => deleteNotification(notification.id)}>
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {selectedNotification && (
                <>
                  {(() => {
                    const config = TYPE_CONFIG[selectedNotification.type] || TYPE_CONFIG.SYSTEM;
                    const Icon = config.icon;
                    return (
                      <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                    );
                  })()}
                  <span className="truncate">{selectedNotification.title}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-muted rounded-lg">
                <p className="text-xs sm:text-sm">{selectedNotification.message}</p>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                <Badge variant={TYPE_CONFIG[selectedNotification.type]?.badge || "default"} className="text-xs">
                  {TYPE_CONFIG[selectedNotification.type]?.label || selectedNotification.type}
                </Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">{formatDate(selectedNotification.createdAt)}</span>
                </span>
              </div>
              {selectedNotification.linkUrl && (
                <Button className="w-full h-9 sm:h-10 text-xs sm:text-sm" asChild>
                  <a href={selectedNotification.linkUrl}>View Details</a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}