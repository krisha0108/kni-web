"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  isFirebaseClientConfigured,
  registerDeviceToken,
  onForegroundMessage,
} from "@/lib/firebase-client";
import { useToast } from "@/hooks/use-toast";

interface PushNotificationContextType {
  isSupported: boolean;
  permission: NotificationPermission;
  token: string | null;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export function usePushNotification() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error("usePushNotification must be used within PushNotificationProvider");
  }
  return context;
}

interface PushNotificationProviderProps {
  children: ReactNode;
}

export function PushNotificationProvider({ children }: PushNotificationProviderProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if Firebase is configured and notifications are supported
    const checkSupport = () => {
      const configured = isFirebaseClientConfigured();
      const supported = "Notification" in window;
      setIsSupported(configured && supported);

      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator && isSupported) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js", { updateViaCache: "none" })
        .then(async (registration) => {
          console.log("Service Worker registered successfully:", registration);

          // Force update check for the service worker
          await registration.update();

          // Auto-register token if permission is already granted
          if (Notification.permission === "granted" && !token) {
            console.log("Permission already granted, auto-registering token...");
            const fcmToken = await registerDeviceToken();
            if (fcmToken) {
              setToken(fcmToken);
            }
          }
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, [isSupported]);

  useEffect(() => {
    // Setup foreground message handler
    if (isSupported && permission === "granted") {
      const unsubscribe = onForegroundMessage((payload) => {
        console.log("Foreground notification received:", payload);

        // Show toast notification
        const title = payload.notification?.title || payload.data?.title || "New Notification";
        const body = payload.notification?.body || payload.data?.body || "";

        toast({
          title,
          description: body,
          duration: 5000,
        });

        // Play notification sound (optional)
        const audio = new Audio("/notification.mp3");
        audio.play().catch((error) => {
          console.log("Could not play notification sound:", error);
        });
      });

      return unsubscribe;
    }
  }, [isSupported, permission, toast]);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.log("Push notifications are not supported");
      return false;
    }

    setIsLoading(true);

    try {
      const fcmToken = await registerDeviceToken();

      if (fcmToken) {
        setToken(fcmToken);
        setPermission("granted");

        toast({
          title: "Notifications Enabled",
          description: "You will now receive push notifications.",
          duration: 3000,
        });

        return true;
      } else {
        setPermission(Notification.permission);
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);

      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
        duration: 3000,
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const value: PushNotificationContextType = {
    isSupported,
    permission,
    token,
    isLoading,
    requestPermission,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}
