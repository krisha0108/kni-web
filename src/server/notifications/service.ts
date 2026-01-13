import { db } from "@/server/db";
import { Role, NotificationType } from "@prisma/client";
import {
  sendPaymentVerifiedEmail,
  sendPaymentRejectedEmail,
  sendEngineerAssignedEmail,
  sendEngineerJobAssignmentEmail,
  sendWorkCompletedEmail,
} from "@/lib/email";
import { sendPushNotification } from "./fcm-service";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  linkUrl?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type || NotificationType.SYSTEM,
      linkUrl: input.linkUrl || null,
    },
  });

  // Send push notification asynchronously (don't await to avoid blocking)
  sendPushNotification({
    userId: input.userId,
    title: input.title,
    body: input.message,
    linkUrl: input.linkUrl,
    notificationId: notification.id,
  }).catch((error) => {
    console.error("Failed to send push notification:", error);
  });

  return notification;
}

export async function createNotificationForRole(
  role: Role,
  title: string,
  message: string,
  type: NotificationType = NotificationType.SYSTEM,
  linkUrl?: string
) {
  const users = await db.user.findMany({
    where: { role, isActive: true },
    select: { id: true },
  });

  if (users.length === 0) return [];

  return db.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      title,
      message,
      type,
      linkUrl: linkUrl || null,
    })),
  });
}

export async function getNotifications(
  userId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  const where = {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [items, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.notification.count({ where }),
  ]);

  return { items, total };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markNotificationsAsRead(
  userId: string,
  ids?: string[]
): Promise<number> {
  const result = await db.notification.updateMany({
    where: {
      userId,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      isRead: false,
    },
    data: { isRead: true },
  });
  return result.count;
}

// Helper functions for common notification scenarios
export async function notifyOwnerRestaurantApproved(
  ownerId: string,
  restaurantName: string
) {
  return createNotification({
    userId: ownerId,
    title: "Restaurant Approved!",
    message: `Your restaurant "${restaurantName}" has been approved. You can now book services.`,
    type: NotificationType.SYSTEM,
    linkUrl: "/owner/restaurant/status",
  });
}

export async function notifyOwnerRestaurantRejected(
  ownerId: string,
  restaurantName: string,
  reason: string
) {
  return createNotification({
    userId: ownerId,
    title: "Restaurant Rejected",
    message: `Your restaurant "${restaurantName}" was rejected. Reason: ${reason}`,
    type: NotificationType.SYSTEM,
    linkUrl: "/owner/restaurant/status",
  });
}

export async function notifyOwnerPaymentVerified(
  ownerId: string,
  bookingId: string
) {
  // Get owner and booking details for email
  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { name: true, email: true },
  });

  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    include: { restaurant: { select: { name: true } } },
  });

  // Send in-app notification
  const notification = await createNotification({
    userId: ownerId,
    title: "Payment Verified",
    message: "Your payment has been verified. An engineer will be assigned soon.",
    type: NotificationType.PAYMENT,
    linkUrl: "/owner/bookings/" + bookingId,
  });

  // Send email (non-blocking)
  if (owner && booking) {
    sendPaymentVerifiedEmail(
      owner.email,
      owner.name,
      bookingId,
      booking.restaurant.name
    ).catch((error) => {
      console.error("Failed to send payment verified email:", error);
    });
  }

  return notification;
}

export async function notifyOwnerPaymentRejected(
  ownerId: string,
  bookingId: string,
  reason: string
) {
  // Get owner and booking details for email
  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { name: true, email: true },
  });

  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    include: { restaurant: { select: { name: true } } },
  });

  // Send in-app notification
  const notification = await createNotification({
    userId: ownerId,
    title: "Payment Rejected",
    message: "Your payment was rejected. Reason: " + reason,
    type: NotificationType.PAYMENT,
    linkUrl: "/owner/bookings/" + bookingId,
  });

  // Send email (non-blocking)
  if (owner && booking) {
    sendPaymentRejectedEmail(
      owner.email,
      owner.name,
      bookingId,
      booking.restaurant.name,
      reason
    ).catch((error) => {
      console.error("Failed to send payment rejected email:", error);
    });
  }

  return notification;
}

export async function notifyOwnerEngineerAssigned(
  ownerId: string,
  bookingId: string,
  engineerName: string
) {
  // Get owner, booking, and engineer details for email
  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { name: true, email: true },
  });

  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    include: {
      restaurant: { select: { name: true } },
    },
  });

  // Send in-app notification
  const notification = await createNotification({
    userId: ownerId,
    title: "Engineer Assigned",
    message: engineerName + " has been assigned to your booking.",
    type: NotificationType.BOOKING,
    linkUrl: "/owner/bookings/" + bookingId,
  });

  // Send email (non-blocking)
  if (owner && booking) {
    sendEngineerAssignedEmail(
      owner.email,
      owner.name,
      bookingId,
      booking.restaurant.name,
      engineerName,
      "" // Engineer phone not available in this context
    ).catch((error) => {
      console.error("Failed to send engineer assigned email:", error);
    });
  }

  return notification;
}

export async function notifyOwnerJobCompleted(
  ownerId: string,
  bookingId: string
) {
  return createNotification({
    userId: ownerId,
    title: "Job Completed",
    message: "Your service booking has been completed.",
    type: NotificationType.BOOKING,
    linkUrl: "/owner/bookings/" + bookingId,
  });
}

export async function notifyEngineerNewJob(
  engineerId: string,
  assignmentId: string,
  restaurantName: string
) {
  // Get engineer, assignment, and booking details for email
  const engineer = await db.user.findUnique({
    where: { id: engineerId },
    select: { name: true, email: true },
  });

  const assignment = await db.engineerAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      booking: {
        include: {
          owner: { select: { name: true, phone: true } },
          restaurant: { select: { name: true, address: true } },
          items: {
            include: {
              serviceItem: { select: { name: true } },
              partItem: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  // Send in-app notification
  const notification = await createNotification({
    userId: engineerId,
    title: "New Job Assignment",
    message: "You have been assigned a job at " + restaurantName + ".",
    type: NotificationType.BOOKING,
    linkUrl: "/engineer/jobs/" + assignmentId,
  });

  // Send email (non-blocking)
  if (engineer && assignment) {
    const items = assignment.booking.items.map((item) => ({
      name: item.serviceItem?.name || item.partItem?.name || "Unknown Item",
      quantity: item.qty,
    }));

    sendEngineerJobAssignmentEmail(
      engineer.email,
      engineer.name,
      assignmentId,
      assignment.booking.restaurant.name,
      assignment.booking.restaurant.address,
      assignment.booking.owner.name,
      assignment.booking.owner.phone || "",
      items
    ).catch((error) => {
      console.error("Failed to send engineer job assignment email:", error);
    });
  }

  return notification;
}

export async function notifyVendorApproved(vendorId: string) {
  return createNotification({
    userId: vendorId,
    title: "Account Approved!",
    message: "Your vendor account has been approved. You can now add products.",
    type: NotificationType.SYSTEM,
    linkUrl: "/vendor/dashboard",
  });
}

export async function notifyVendorRejected(vendorId: string, reason: string) {
  return createNotification({
    userId: vendorId,
    title: "Account Rejected",
    message: "Your vendor application was rejected. Reason: " + reason,
    type: NotificationType.SYSTEM,
    linkUrl: "/vendor/pending",
  });
}

export async function notifyAdminsNewRestaurantRequest(
  restaurantName: string,
  ownerName: string
) {
  return createNotificationForRole(
    Role.ADMIN,
    "New Restaurant Request",
    ownerName + " has submitted " + restaurantName + " for approval.",
    NotificationType.SYSTEM,
    "/admin/restaurants/requests"
  );
}

export async function notifyAdminsNewPaymentUploaded(
  bookingId: string,
  ownerName: string
) {
  return createNotificationForRole(
    Role.ADMIN,
    "Payment Proof Uploaded",
    ownerName + " has uploaded a payment proof.",
    NotificationType.PAYMENT,
    "/admin/bookings/" + bookingId
  );
}

export async function notifyOwnerEngineerStarted(
  ownerId: string,
  bookingId: string,
  engineerName: string
) {
  return createNotification({
    userId: ownerId,
    title: "Work Started",
    message: `${engineerName} has started working on your service booking.`,
    type: NotificationType.BOOKING,
    linkUrl: "/owner/bookings/" + bookingId,
  });
}

export async function notifyOwnerServiceCompleted(
  ownerId: string,
  bookingId: string
) {
  // Get owner, booking, and work log details for email
  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { name: true, email: true },
  });

  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    include: {
      restaurant: { select: { name: true } },
      engineerAssignments: {
        include: {
          engineer: { select: { name: true } },
          workLog: { select: { completionNote: true } },
        },
        orderBy: {
          completedAt: 'desc',
        },
      },
    },
  });

  // Send in-app notification
  const notification = await createNotification({
    userId: ownerId,
    title: "Service Completed",
    message: "Your service booking has been completed successfully.",
    type: NotificationType.BOOKING,
    linkUrl: "/owner/bookings/" + bookingId,
  });

  // Send email (non-blocking) - use the most recently completed assignment
  if (owner && booking && booking.engineerAssignments.length > 0) {
    const completedAssignment = booking.engineerAssignments.find(a => a.workLog);
    if (completedAssignment) {
      sendWorkCompletedEmail(
        owner.email,
        owner.name,
        bookingId,
        booking.restaurant.name,
        completedAssignment.engineer.name,
        completedAssignment.workLog?.completionNote || ""
      ).catch((error) => {
        console.error("Failed to send work completed email:", error);
      });
    }
  }

  return notification;
}
