import { getMessaging, isFirebaseConfigured } from "@/lib/firebase-admin";
import { db } from "@/server/db";

interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  linkUrl?: string;
  notificationId?: string;
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    console.log("Firebase not configured. Skipping push notification.");
    return false;
  }

  try {
    console.log(`📤 Sending push notification to user ${payload.userId}`);
    console.log(`   Title: ${payload.title}`);
    console.log(`   Body: ${payload.body}`);

    // Get user's notification preferences
    const preferences = await db.notificationPreference.findUnique({
      where: { userId: payload.userId },
    });

    // Check if push notifications are enabled
    if (preferences && !preferences.enablePush) {
      console.log(`❌ Push notifications disabled for user ${payload.userId}`);
      return false;
    }

    // Get active device tokens for the user (latest per platform to avoid duplicates)
    const allTokens = await db.deviceToken.findMany({
      where: {
        userId: payload.userId,
        isActive: true,
      },
      orderBy: { lastUsed: "desc" },
    });

    // Keep only the most recent token per platform to prevent duplicate push notifications
    const seenPlatforms = new Set<string>();
    const deviceTokens = allTokens.filter((t) => {
      const platform = t.platform || "unknown";
      if (seenPlatforms.has(platform)) return false;
      seenPlatforms.add(platform);
      return true;
    });

    console.log(`📱 Found ${allTokens.length} active token(s), using ${deviceTokens.length} (latest per platform) for user ${payload.userId}`);

    if (deviceTokens.length === 0) {
      console.log(`❌ No active device tokens found for user ${payload.userId}`);
      return false;
    }

    // Log token info (first 20 chars only for security)
    deviceTokens.forEach((t, i) => {
      console.log(`   Token ${i + 1}: ${t.token.substring(0, 20)}... (platform: ${t.platform})`);
    });

    const messaging = getMessaging();
    if (!messaging) {
      console.error("❌ Firebase Messaging not available");
      return false;
    }

    // Prepare FCM data - ALL values must be strings
    const fcmData: Record<string, string> = {
      title: payload.title,
      body: payload.body,
      ...(payload.linkUrl && { linkUrl: payload.linkUrl }),
    };

    // Convert any additional data to strings
    if (payload.data) {
      Object.entries(payload.data).forEach(([key, value]) => {
        fcmData[key] = String(value);
      });
    }

    // Send to all device tokens
    const results = await Promise.allSettled(
      deviceTokens.map(async (deviceToken) => {
        try {
          const message = {
            token: deviceToken.token,
            // NOTE: No top-level `notification` key — data-only message.
            // This prevents FCM from auto-displaying on Android (which caused
            // duplicates when the app's background handler also displayed via Notifee).
            // The mobile apps read title/body from `data` and display via Notifee.
            data: fcmData,
            // Android: high priority ensures data-only messages wake the app
            android: {
              priority: "high" as const,
            },
            // iOS: content-available ensures background delivery for data-only messages
            apns: {
              payload: {
                aps: {
                  alert: {
                    title: payload.title,
                    body: payload.body,
                  },
                  sound: "default",
                  badge: 1,
                  "content-available": 1,
                },
              },
              headers: {
                "apns-priority": "10",
              },
            },
            // Web: uses its own notification display
            webpush: {
              fcmOptions: {
                link: payload.linkUrl || "/",
              },
              notification: {
                title: payload.title,
                body: payload.body,
                icon: "/icon-192x192.png",
                badge: "/badge-72x72.png",
                requireInteraction: false,
              },
            },
          };

          console.log(`📤 Sending to token: ${deviceToken.token.substring(0, 20)}...`);
          const response = await messaging.send(message);
          console.log(`✅ FCM send successful! Message ID: ${response}`);

          // Log successful delivery
          await db.pushNotificationLog.create({
            data: {
              notificationId: payload.notificationId || null,
              userId: payload.userId,
              fcmMessageId: response,
              title: payload.title,
              body: payload.body,
              data: fcmData,
              status: "SENT",
            },
          });

          // Update last used timestamp
          await db.deviceToken.update({
            where: { id: deviceToken.id },
            data: { lastUsed: new Date() },
          });

          return { success: true, messageId: response };
        } catch (error: any) {
          console.error(`❌ FCM send failed for token ${deviceToken.token.substring(0, 20)}...`);
          console.error(`   Error code: ${error.code}`);
          console.error(`   Error message: ${error.message}`);

          // Handle token errors (expired, invalid, unregistered)
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            console.log(`   ⚠️ Token is invalid/expired, deactivating...`);
            // Deactivate the token
            await db.deviceToken.update({
              where: { id: deviceToken.id },
              data: { isActive: false },
            });
          }

          // Log failed delivery
          await db.pushNotificationLog.create({
            data: {
              notificationId: payload.notificationId || null,
              userId: payload.userId,
              title: payload.title,
              body: payload.body,
              data: fcmData,
              status: "FAILED",
              errorMessage: error.message || "Unknown error",
            },
          });

          throw error;
        }
      })
    );

    // Check if at least one notification was sent successfully
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    return successCount > 0;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}

/**
 * Send push notifications to multiple users
 */
export async function sendPushNotificationToMultipleUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  linkUrl?: string
): Promise<void> {
  await Promise.allSettled(
    userIds.map((userId) =>
      sendPushNotification({
        userId,
        title,
        body,
        data,
        linkUrl,
      })
    )
  );
}
