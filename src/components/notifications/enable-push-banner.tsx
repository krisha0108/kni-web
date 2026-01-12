"use client";

import { useState, useEffect } from "react";
import { usePushNotification } from "@/components/providers/push-notification-provider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, X } from "lucide-react";

export function EnablePushBanner() {
  const { isSupported, permission, requestPermission, isLoading } = usePushNotification();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the banner
    const dismissed = localStorage.getItem("push-banner-dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  const handleEnable = async () => {
    const success = await requestPermission();
    if (success) {
      setIsDismissed(true);
      localStorage.setItem("push-banner-dismissed", "true");
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("push-banner-dismissed", "true");
  };

  // Don't show banner if:
  // - Not supported
  // - User already dismissed it
  // - Permission already granted
  // - Permission explicitly denied
  if (!isSupported || isDismissed || permission === "granted" || permission === "denied") {
    return null;
  }

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <Bell className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">Enable Push Notifications</AlertTitle>
      <AlertDescription className="text-blue-800">
        Stay updated with real-time notifications about your bookings, payments, and orders.
      </AlertDescription>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={handleEnable} disabled={isLoading}>
          {isLoading ? "Enabling..." : "Enable Notifications"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleDismiss}>
          <X className="h-4 w-4 mr-1" />
          Dismiss
        </Button>
      </div>
    </Alert>
  );
}
