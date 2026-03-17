"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=10");
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
        }
        return;
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return;
      }
      const data = await response.json();
      if (data.ok) {
        setNotifications(data.data?.items || []);
      }
    } catch (error) {
      console.debug("Notifications not available");
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications/unread-count");
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
        }
        setIsLoading(false);
        return;
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      if (data.ok) {
        setUnreadCount(data.data.count);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.debug("Unread count not available");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => {
      // Only poll if authenticated
      if (isAuthenticated) {
        fetchUnreadCount();
      }
    }, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

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
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
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
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const markAsUnread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch("/api/notifications/mark-unread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
      setUnreadCount((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to mark as unread:", error);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
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
    return `${days}d ago`;
  };

  const filteredNotifications =
    filterType === "all"
      ? notifications
      : notifications.filter((n) => (n.type || "SYSTEM") === filterType);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button data-tour="notifications" variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {!isLoading && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>

        <div className="p-3 border-b bg-muted/30">
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All notifications</SelectItem>
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
        </div>

        <ScrollArea className="h-[60vh] sm:h-[400px]">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No notifications</p>
              {filterType !== "all" && (
                <p className="text-xs mt-1">Try changing the filter</p>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => {
                const notifType = (notification.type || "SYSTEM") as NotificationType;
                const config = notificationTypeConfig[notifType];
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors",
                      !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/10"
                    )}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                          config.bgColor
                        )}
                      >
                        <Icon className={cn("h-5 w-5", config.color)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm leading-tight">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-600" />
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs py-0">
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {notification.linkUrl && (
                              <Link
                                href={notification.linkUrl}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!notification.isRead) {
                                    markAsRead(notification.id);
                                  }
                                  setIsOpen(false);
                                }}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  title="View details"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            )}
                            {notification.isRead ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={(e) => markAsUnread(notification.id, e)}
                                title="Mark as unread"
                              >
                                <MailOpen className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => markAsRead(notification.id)}
                                title="Mark as read"
                              >
                                <Bell className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={(e) => deleteNotification(notification.id, e)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t bg-muted/30">
          <Link href="/notifications" onClick={() => setIsOpen(false)}>
            <Button variant="outline" className="w-full" size="sm">
              View all notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
