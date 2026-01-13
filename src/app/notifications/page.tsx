"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Calendar,
  DollarSign,
  ShoppingCart,
  Wrench,
  Settings,
  Megaphone,
  MailOpen,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type NotificationType = "BOOKING" | "PAYMENT" | "ORDER" | "AMC" | "EQUIPMENT" | "SYSTEM" | "ANNOUNCEMENT";

interface Notification {
  id: string;
  title: string;
  message: string;
  type?: NotificationType;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const notificationTypeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  BOOKING: {
    icon: Calendar,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Bookings",
  },
  PAYMENT: {
    icon: DollarSign,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Payments",
  },
  ORDER: {
    icon: ShoppingCart,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    label: "Orders",
  },
  AMC: {
    icon: Wrench,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    label: "AMC",
  },
  EQUIPMENT: {
    icon: Settings,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    label: "Equipment",
  },
  SYSTEM: {
    icon: Bell,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: "System",
  },
  ANNOUNCEMENT: {
    icon: Megaphone,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Announcements",
  },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notifications?limit=100");
      if (!response.ok) return;
      const data = await response.json();
      if (data.ok) {
        setNotifications(data.data.items);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAsUnread = async (id: string) => {
    try {
      await fetch("/api/notifications/mark-unread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
    } catch (error) {
      console.error("Failed to mark as unread:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications
    .filter((n) => {
      if (filterType !== "all" && (n.type || "SYSTEM") !== filterType) return false;
      if (filterStatus === "unread" && n.isRead) return false;
      if (filterStatus === "read" && !n.isRead) return false;
      return true;
    });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead}>Mark all as read</Button>
        )}
      </div>

      <div className="flex gap-4">
        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(notificationTypeConfig).map(([type, config]) => (
              <SelectItem key={type} value={type}>
                <div className="flex items-center gap-2">
                  <config.icon className={cn("h-4 w-4", config.color)} />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All notifications</SelectItem>
            <SelectItem value="unread">Unread only</SelectItem>
            <SelectItem value="read">Read only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-lg text-muted-foreground">No notifications</p>
            {(filterType !== "all" || filterStatus !== "all") && (
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const notifType = (notification.type || "SYSTEM") as NotificationType;
            const config = notificationTypeConfig[notifType];
            const Icon = config.icon;

            return (
              <Card
                key={notification.id}
                className={cn(
                  "transition-colors",
                  !notification.isRead && "border-l-4 border-l-blue-500 bg-blue-50/30"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div
                      className={cn(
                        "flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center",
                        config.bgColor
                      )}
                    >
                      <Icon className={cn("h-6 w-6", config.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base">{notification.title}</h3>
                          {!notification.isRead && (
                            <div className="flex-shrink-0 h-2.5 w-2.5 rounded-full bg-blue-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {notification.linkUrl && (
                            <Link
                              href={notification.linkUrl}
                              onClick={() => {
                                if (!notification.isRead) {
                                  markAsRead(notification.id);
                                }
                              }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                title="View details"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {notification.isRead ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => markAsUnread(notification.id)}
                              title="Mark as unread"
                            >
                              <MailOpen className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:text-destructive"
                            onClick={() => deleteNotification(notification.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
