// Firebase Messaging Service Worker
// This file handles background push notifications when the app is not in focus

// Import Firebase scripts
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Initialize Firebase in the service worker
// Note: These values should match your Firebase config
// They are safe to expose in the service worker as they're public values
const firebaseConfig = {
  apiKey: "AIzaSyDqIh_8PdktvlXpkLCwOJUo5gCxuwkGVfE",
  authDomain: "kni-super-app.firebaseapp.com",
  projectId: "kni-super-app",
  storageBucket: "kni-super-app.firebasestorage.app",
  messagingSenderId: "896374925078",
  appId: "1:896374925078:web:9c601f2cf8f40db53c1237",
};

// Log service worker activation
self.addEventListener("install", () => {
  console.log("[firebase-messaging-sw.js] Service Worker installing...");
  // Force the waiting service worker to become active
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[firebase-messaging-sw.js] Service Worker activating...");
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim());
});

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message:", payload);

    // Extract notification data from either notification or data payload
    const notificationTitle = payload.notification?.title || payload.data?.title || "New Notification";
    const notificationBody = payload.notification?.body || payload.data?.body || "";

    // Only show notification if we have content
    if (!notificationTitle && !notificationBody) {
      console.log("[firebase-messaging-sw.js] No notification content, skipping display");
      return;
    }

    const notificationOptions = {
      body: notificationBody,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: payload.data?.notificationId || `notification-${Date.now()}`,
      data: {
        url: payload.data?.linkUrl || payload.fcmOptions?.link || "/",
        ...payload.data,
      },
      requireInteraction: false,
      vibrate: [200, 100, 200],
      // Ensure notification is shown even if page is focused
      renotify: true,
    };

    // Show the notification
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // Handle notification click
  self.addEventListener("notificationclick", (event) => {
    console.log("[firebase-messaging-sw.js] Notification clicked:", event);

    event.notification.close();

    // Get the URL from the notification data
    const urlToOpen = event.notification.data?.url || "/";

    // Open or focus the app
    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url === urlToOpen && "focus" in client) {
              return client.focus();
            }
          }

          // If no window is open, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  });
} catch (error) {
  console.error("[firebase-messaging-sw.js] Error initializing Firebase:", error);
}
