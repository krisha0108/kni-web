"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, CheckCircle, XCircle, Building2, User, Calendar,
  FileText, AlertCircle, RefreshCw, Eye
} from "lucide-react";
import { useRestaurant } from "@/contexts/restaurant-context";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface PendingItem {
  id: string;
  type: "RESTAURANT" | "TEAM_INVITE" | "BOOKING" | "CATEGORY_REQUEST";
  title: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  metadata?: {
    restaurantName?: string;
    memberEmail?: string;
    bookingId?: string;
  };
}

const TYPE_CONFIG = {
  RESTAURANT: { icon: Building2, label: "Restaurant Approval", color: "bg-blue-100 text-blue-600" },
  TEAM_INVITE: { icon: User, label: "Team Invitation", color: "bg-purple-100 text-purple-600" },
  BOOKING: { icon: Calendar, label: "Booking Approval", color: "bg-green-100 text-green-600" },
  CATEGORY_REQUEST: { icon: FileText, label: "Category Request", color: "bg-orange-100 text-orange-600" },
};

const STATUS_CONFIG = {
  PENDING: { icon: Clock, label: "Pending", variant: "warning" as const },
  APPROVED: { icon: CheckCircle, label: "Approved", variant: "success" as const },
  REJECTED: { icon: XCircle, label: "Rejected", variant: "destructive" as const },
};

export default function PendingApprovalsPage() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingItems();
  }, [selectedRestaurant]);

  const fetchPendingItems = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedRestaurant) {
        params.append("restaurantId", selectedRestaurant.restaurantId);
      }

      const response = await fetch("/api/owner/pending-approvals?" + params.toString());

      if (!response.ok) {
        throw new Error("API not available");
      }

      const data = await response.json();

      if (data.ok) {
        setItems(data.data || []);
      } else {
        setItems([]);
        toast({ title: "Error", description: data.error || "Failed to load pending approvals", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to fetch pending items:", error);
      setItems([]);
      toast({ title: "Error", description: "Failed to load pending approvals", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return item.status === "PENDING";
    return item.type === activeTab;
  });

  const pendingCount = items.filter((i) => i.status === "PENDING").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            Pending Approvals
            {pendingCount > 0 && (
              <Badge variant="warning">{pendingCount}</Badge>
            )}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track status of your pending requests and approvals
          </p>
        </div>
        <Button variant="outline" onClick={fetchPendingItems} size="sm" className="sm:size-default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-yellow-100">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-2xl font-bold leading-tight break-all">{items.filter(i => i.status === "PENDING").length}</p>
                <p className="text-xs text-muted-foreground truncate">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-2xl font-bold leading-tight break-all">{items.filter(i => i.status === "APPROVED").length}</p>
                <p className="text-xs text-muted-foreground truncate">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-red-100">
                <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-2xl font-bold leading-tight break-all">{items.filter(i => i.status === "REJECTED").length}</p>
                <p className="text-xs text-muted-foreground truncate">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-2xl font-bold leading-tight break-all">{items.length}</p>
                <p className="text-xs text-muted-foreground truncate">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 mb-4 scrollbar-hide">
          <div className="px-4 sm:px-0 min-w-min">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm whitespace-nowrap">Pending Only</TabsTrigger>
              <TabsTrigger value="RESTAURANT" className="text-xs sm:text-sm whitespace-nowrap">Restaurants</TabsTrigger>
              <TabsTrigger value="TEAM_INVITE" className="text-xs sm:text-sm whitespace-nowrap">Team</TabsTrigger>
              <TabsTrigger value="BOOKING" className="text-xs sm:text-sm whitespace-nowrap">Bookings</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Approval Items ({filteredItems.length})</CardTitle>
              <CardDescription>Review status of your requests</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">All Caught Up!</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    No pending items to review
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredItems.map((item) => {
                    const typeConfig = TYPE_CONFIG[item.type];
                    const statusConfig = STATUS_CONFIG[item.status];
                    const TypeIcon = typeConfig.icon;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border"
                      >
                        <div className="flex items-start gap-3 sm:gap-4 w-full sm:flex-1">
                          <div className={`p-2 rounded-lg ${typeConfig.color} shrink-0`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-medium text-sm sm:text-base">{item.title}</p>
                              <Badge variant="outline" className="text-xs">{typeConfig.label}</Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                              <Badge variant={statusConfig.variant} className="gap-1 text-xs">
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(item.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {item.type === "RESTAURANT" && item.status === "PENDING" && (
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" asChild>
                              <Link href="/owner/restaurant/status">
                                <Eye className="h-4 w-4 mr-1" />
                                View Status
                              </Link>
                            </Button>
                          )}
                          {item.type === "TEAM_INVITE" && item.status === "PENDING" && (
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" asChild>
                              <Link href="/owner/team">
                                <Eye className="h-4 w-4 mr-1" />
                                View Team
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help Card */}
      <Card className="mt-6">
        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 shrink-0">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm sm:text-base">Need Help?</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Approvals are typically processed within 24-48 hours. If your request has been pending
                for longer, please contact our support team.
              </p>
              <Button variant="link" className="px-0 mt-2 text-xs sm:text-sm h-auto" asChild>
                <Link href="/owner/support">Contact Support</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}