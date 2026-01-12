"use client";

import { useEffect, useState } from "react";
import { usePushNotification } from "@/components/providers/push-notification-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferences {
  enablePush: boolean;
  enableEmail: boolean;
  enableInApp: boolean;
  notifyOnPayment: boolean;
  notifyOnBooking: boolean;
  notifyOnEngineer: boolean;
  notifyOnCompletion: boolean;
  notifyOnOrder: boolean;
}

export function NotificationSettings() {
  const { isSupported, permission, requestPermission, isLoading: permissionLoading } = usePushNotification();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/notifications/preferences");
      const result = await response.json();

      if (result.ok && result.data) {
        setPreferences(result.data);
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    // Optimistic update
    const updatedPreferences = { ...preferences, [key]: value };
    setPreferences(updatedPreferences);

    setIsSaving(true);

    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Failed to update preference");
      }

      toast({
        title: "Saved",
        description: "Notification preference updated successfully.",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error updating notification preference:", error);

      // Revert optimistic update
      setPreferences(preferences);

      toast({
        title: "Error",
        description: "Failed to update preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnablePush = async () => {
    const success = await requestPermission();
    if (success) {
      await updatePreference("enablePush", true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load notification preferences.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notifications Status */}
      {isSupported && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {permission === "granted" ? (
                <Bell className="h-5 w-5 text-green-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              Push Notifications
            </CardTitle>
            <CardDescription>
              {permission === "granted"
                ? "Push notifications are enabled for this device."
                : permission === "denied"
                ? "Push notifications are blocked. Please enable them in your browser settings."
                : "Enable push notifications to receive real-time updates."}
            </CardDescription>
          </CardHeader>
          {permission !== "granted" && permission !== "denied" && (
            <CardContent>
              <Button onClick={handleEnablePush} disabled={permissionLoading}>
                {permissionLoading ? "Requesting..." : "Enable Push Notifications"}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enablePush">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications on this device</p>
            </div>
            <Switch
              id="enablePush"
              checked={preferences.enablePush}
              onCheckedChange={(checked) => updatePreference("enablePush", checked)}
              disabled={isSaving || permission !== "granted"}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableEmail">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch
              id="enableEmail"
              checked={preferences.enableEmail}
              onCheckedChange={(checked) => updatePreference("enableEmail", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableInApp">In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">Show notifications in the app</p>
            </div>
            <Switch
              id="enableInApp"
              checked={preferences.enableInApp}
              onCheckedChange={(checked) => updatePreference("enableInApp", checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>Choose which events trigger notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifyOnPayment">Payment Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Payment verification and rejection updates
              </p>
            </div>
            <Switch
              id="notifyOnPayment"
              checked={preferences.notifyOnPayment}
              onCheckedChange={(checked) => updatePreference("notifyOnPayment", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifyOnBooking">Booking Notifications</Label>
              <p className="text-sm text-muted-foreground">New bookings and status updates</p>
            </div>
            <Switch
              id="notifyOnBooking"
              checked={preferences.notifyOnBooking}
              onCheckedChange={(checked) => updatePreference("notifyOnBooking", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifyOnEngineer">Engineer Notifications</Label>
              <p className="text-sm text-muted-foreground">Engineer assignment and job updates</p>
            </div>
            <Switch
              id="notifyOnEngineer"
              checked={preferences.notifyOnEngineer}
              onCheckedChange={(checked) => updatePreference("notifyOnEngineer", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifyOnCompletion">Completion Notifications</Label>
              <p className="text-sm text-muted-foreground">Service completion updates</p>
            </div>
            <Switch
              id="notifyOnCompletion"
              checked={preferences.notifyOnCompletion}
              onCheckedChange={(checked) => updatePreference("notifyOnCompletion", checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifyOnOrder">Order Notifications</Label>
              <p className="text-sm text-muted-foreground">Marketplace order updates</p>
            </div>
            <Switch
              id="notifyOnOrder"
              checked={preferences.notifyOnOrder}
              onCheckedChange={(checked) => updatePreference("notifyOnOrder", checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
