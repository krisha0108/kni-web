"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check } from "lucide-react";
import {
  getAMCStatusColor,
  getAMCStatusLabel,
  getAMCDurationLabel,
  getDaysRemaining,
  getUsageStatus,
  isExpiringSoon,
} from "@/lib/amc";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";

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
  planDescription: string | null;
  duration: "MONTHLY" | "QUARTERLY" | "YEARLY";
  featuresJson: string[] | null;
  cancelledAt: string | null;
  createdAt: string;
  plan?: {
    // Optional - only for template plans
    id: string;
    name: string;
    description: string | null;
    duration: "MONTHLY" | "QUARTERLY" | "YEARLY";
    price: number;
    serviceLimit: number;
    featuresJson: string[] | null;
  } | null;
  equipment?: {
    // Equipment-centric
    id: string;
    name: string;
    category: string;
    serialNumber: string | null;
  } | null;
  restaurant: {
    id: string;
    name: string;
    address: string;
    city: string;
  };
  usageLogs: Array<{
    id: string;
    serviceDate: string;
    serviceType: string;
    notes: string | null;
    createdAt: string;
  }>;
}

export default function AMCSubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [subscription, setSubscription] = useState<AMCSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchSubscription();
  }, [resolvedParams.id]);

  const fetchSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/owner/amc-subscriptions/${resolvedParams.id}`);
      const data = await response.json();
      if (data.ok) {
        setSubscription(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Subscription not found",
          variant: "destructive",
        });
        router.push("/owner/amc-subscriptions");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch subscription details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this subscription? This action cannot be undone.")) return;

    try {
      setIsCancelling(true);
      const response = await fetch(`/api/owner/amc-subscriptions/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Subscription cancelled successfully",
        });
        fetchSubscription();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to cancel subscription",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription) return;

    try {
      const response = await fetch(`/api/owner/amc-subscriptions/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRenew: !subscription.autoRenew }),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: `Auto-renew ${!subscription.autoRenew ? "enabled" : "disabled"} successfully`,
        });
        fetchSubscription();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update auto-renew",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update auto-renew",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading...</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Subscription not found</p>
      </div>
    );
  }

  // Get display values (support both custom plans and template plans)
  const displayName = subscription.planName || subscription.plan?.name || "Custom AMC Plan";
  const displayDescription = subscription.planDescription || subscription.plan?.description;
  const displayDuration = subscription.duration || subscription.plan?.duration || "MONTHLY";
  const displayServiceLimit = subscription.serviceLimit;
  const displayFeatures = subscription.featuresJson || subscription.plan?.featuresJson;

  const usageStatus = getUsageStatus(subscription.servicesUsed, displayServiceLimit);
  const daysLeft = getDaysRemaining(subscription.endDate);
  const expiringSoon = isExpiringSoon(subscription.endDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/owner/amc-subscriptions")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground">
            {subscription.equipment ? `${subscription.equipment.name} - ${subscription.restaurant.name}` : subscription.restaurant.name}
          </p>
        </div>
        <Badge variant={getAMCStatusColor(subscription.status)}>
          {getAMCStatusLabel(subscription.status)}
        </Badge>
      </div>

      {subscription.status === "ACTIVE" && expiringSoon && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
          <p className="text-sm text-orange-800">
            ⚠ Your subscription expires in <strong>{daysLeft} days</strong> on {formatDate(subscription.endDate)}.
            {!subscription.autoRenew && " Enable auto-renew to continue your service."}
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan Name</p>
              <p className="font-medium">{displayName}</p>
            </div>
            {displayDescription && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{displayDescription}</p>
              </div>
            )}
            {subscription.equipment && (
              <div>
                <p className="text-sm text-muted-foreground">Equipment</p>
                <p className="font-medium">{subscription.equipment.name}</p>
                <p className="text-xs text-muted-foreground">{subscription.equipment.category}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{getAMCDurationLabel(displayDuration)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Limit</p>
              <p className="font-medium">{displayServiceLimit} calls</p>
            </div>
            {displayFeatures && Array.isArray(displayFeatures) && displayFeatures.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Features</p>
                <ul className="space-y-1">
                  {displayFeatures.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Subscription Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Restaurant</p>
              <p className="font-medium">{subscription.restaurant.name}</p>
              <p className="text-sm text-muted-foreground">{subscription.restaurant.address}, {subscription.restaurant.city}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatDate(subscription.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{formatDate(subscription.endDate)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{formatPrice(subscription.totalAmount)}</p>
            </div>
            {subscription.status === "CANCELLED" && subscription.cancelledAt && (
              <div>
                <p className="text-sm text-muted-foreground">Cancelled At</p>
                <p className="font-medium">{formatDateTime(subscription.cancelledAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {subscription.status === "ACTIVE" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Service Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Services Used</span>
                <Badge variant={usageStatus.color}>
                  {usageStatus.label}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{subscription.servicesUsed} used</span>
                  <span>{displayServiceLimit} total</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      usageStatus.color === "destructive"
                        ? "bg-red-500"
                        : usageStatus.color === "warning"
                        ? "bg-orange-500"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (subscription.servicesUsed / displayServiceLimit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription.status === "ACTIVE" && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-Renew</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically renew when subscription expires
                    </p>
                  </div>
                  <Button
                    variant={subscription.autoRenew ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleAutoRenew}
                  >
                    {subscription.autoRenew ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleCancel}
                    disabled={isCancelling}
                  >
                    {isCancelling ? "Cancelling..." : "Cancel Subscription"}
                  </Button>
                </div>
              </>
            )}
            {subscription.status !== "ACTIVE" && (
              <p className="text-sm text-muted-foreground">
                This subscription is {subscription.status.toLowerCase()} and cannot be modified.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Service Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription.usageLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No service usage recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Date</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Logged At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscription.usageLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.serviceDate)}</TableCell>
                    <TableCell>{log.serviceType}</TableCell>
                    <TableCell>{log.notes || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
