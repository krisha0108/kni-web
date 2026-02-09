import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";

let app: FirebaseApp | undefined;
let messaging: Messaging | undefined;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseClientConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
}

export function getFirebaseApp(): FirebaseApp | undefined {
  if (!isFirebaseClientConfigured()) {
    console.warn("Firebase client not configured. Push notifications will be disabled.");
    return undefined;
  }

  if (app) return app;

  try {
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
    return app;
  } catch (error) {
    console.error("Failed to initialize Firebase app:", error);
    return undefined;
  }
}

export async function getFirebaseMessaging(): Promise<Messaging | undefined> {
  if (messaging) return messaging;

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return undefined;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("Firebase Messaging is not supported in this browser.");
      return undefined;
    }

    messaging = getMessaging(firebaseApp);
    return messaging;
  } catch (error) {
    console.error("Failed to initialize Firebase Messaging:", error);
    return undefined;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications.");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return "denied";
  }
}

export async function registerDeviceToken(): Promise<string | null> {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      console.log("Notification permission not granted");
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.log("Firebase Messaging not available");
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error("VAPID key not configured");
      return null;
    }

    const token = await getToken(messaging, { vapidKey });
    if (!token) {
      console.log("Failed to get FCM token");
      return null;
    }

    // Register token with backend
    const response = await fetch("/api/notifications/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      // 401 means user is not logged in - this is expected on public pages like login
      if (response.status === 401) {
        console.log("User not authenticated, skipping token registration");
        return null;
      }
      console.error("Failed to register token with backend:", response.status);
      return null;
    }

    return token;
  } catch (error) {
    console.error("Error registering device token:", error);
    return null;
  }
}

export async function unregisterDeviceToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("/api/notifications/unregister-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error unregistering device token:", error);
    return false;
  }
}

export function onForegroundMessage(callback: (payload: any) => void): (() => void) | undefined {
  getFirebaseMessaging().then((messaging) => {
    if (!messaging) {
      console.log("Firebase Messaging not available for foreground messages");
      return;
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      callback(payload);
    });

    return unsubscribe;
  });

  return undefined;
}
