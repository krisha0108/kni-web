"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { getAMCStatusColor, getAMCStatusLabel, getDaysRemaining, getServiceUsagePercentage } from "@/lib/amc";
import { formatDate, formatPrice } from "@/lib/utils";

interface AMCSubscription {
  id: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  servicesUsed: number;
  serviceLimit: number; // Now directly on subscription
  totalAmount: number;
  autoRenew: boolean;
  planName: string | null; // Custom plan name
  duration: string;
  createdAt: string;
  plan?: {
    // Optional - only for template plans
    id: string;
    name: string;
    duration: string;
    serviceLimit: number;
  } | null;
  equipment?: {
    // Equipment-centric
    id: string;
    name: string;
    category: string;
  } | null;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  restaurant: {
    id: string;
    name: string;
    city: string;
  };
}

export default function AdminAMCSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AMCSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptions();
  }, [search, statusFilter]);

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch("/api/admin/amc-subscriptions?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setSubscriptions(data.data.subscriptions || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch AMC subscriptions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AMC Subscriptions</h1>
        <p className="text-muted-foreground">View all customer AMC subscriptions</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by owner, restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ClientOnly>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Auto Renew</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No AMC subscriptions found.
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub) => {
                const displayName = sub.planName || sub.plan?.name || "Custom AMC Plan";
                const displayServiceLimit = sub.serviceLimit;
                const usagePercent = getServiceUsagePercentage(sub.servicesUsed, displayServiceLimit);
                const daysLeft = getDaysRemaining(sub.endDate);

                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.owner.name}</p>
                        <p className="text-sm text-muted-foreground">{sub.owner.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.restaurant.name}</p>
                        <p className="text-sm text-muted-foreground">{sub.restaurant.city}</p>
                        {sub.equipment && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Equipment: {sub.equipment.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{displayName}</p>
                        <p className="text-sm text-muted-foreground">{formatPrice(sub.totalAmount)}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(sub.startDate)}</TableCell>
                    <TableCell>
                      <div>
                        <p>{formatDate(sub.endDate)}</p>
                        {sub.status === "ACTIVE" && (
                          <p className="text-xs text-muted-foreground">
                            {daysLeft} days left
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {sub.servicesUsed} / {displayServiceLimit}
                        </p>
                        <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getAMCStatusColor(sub.status)}>
                        {getAMCStatusLabel(sub.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.autoRenew ? "default" : "secondary"}>
                        {sub.autoRenew ? "Yes" : "No"}
                      </Badge>
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
