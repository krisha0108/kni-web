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
    // Get user's notification preferences
    const preferences = await db.notificationPreference.findUnique({
      where: { userId: payload.userId },
    });

    // Check if push notifications are enabled
    if (preferences && !preferences.enablePush) {
      console.log(`Push notifications disabled for user ${payload.userId}`);
      return false;
    }

    // Get active device tokens for the user
    const deviceTokens = await db.deviceToken.findMany({
      where: {
        userId: payload.userId,
        isActive: true,
      },
    });

    if (deviceTokens.length === 0) {
      console.log(`No active device tokens found for user ${payload.userId}`);
      return false;
    }

    const messaging = getMessaging();
    if (!messaging) {
      console.error("Firebase Messaging not available");
      return false;
    }

    // Prepare FCM message
    const fcmData = {
      title: payload.title,
      body: payload.body,
      ...(payload.linkUrl && { linkUrl: payload.linkUrl }),
      ...(payload.data || {}),
    };

    // Send to all device tokens
    const results = await Promise.allSettled(
      deviceTokens.map(async (deviceToken) => {
        try {
          const message = {
            token: deviceToken.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: fcmData,
            webpush: {
              fcmOptions: {
                link: payload.linkUrl || "/",
              },
            },
          };

          const response = await messaging.send(message);

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
          // Handle token errors (expired, invalid, unregistered)
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
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
