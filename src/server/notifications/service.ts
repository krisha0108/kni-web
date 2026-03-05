import { db } from "@/server/db";
import { Role, NotificationType, RestaurantRole } from "@prisma/client";
import {
  sendPaymentVerifiedEmail,
  sendPaymentRejectedEmail,
  sendEngineerAssignedEmail,
  sendEngineerJobAssignmentEmail,
  sendWorkCompletedEmail,
} from "@/lib/email";
import { sendPushNotification, sendPushNotificationToMultipleUsers } from "./fcm-service";
import { sendSMS, sendSMSFromTemplate } from "@/server/sms/service";
import { autoSyncBooking } from "@/server/khatabook/service";

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

// Team member notification
interface NotifyTeamInput {
  restaurantId: string;
  excludeUserIds?: string[];
  roles: RestaurantRole[];
  title: string;
  message: string;
  type?: NotificationType;
  linkUrl?: string;
}

export async function notifyRestaurantTeam(input: NotifyTeamInput) {
  try {
    const members = await db.restaurantMember.findMany({
      where: {
        restaurantId: input.restaurantId,
        acceptedAt: { not: null },
        role: { in: input.roles },
        ...(input.excludeUserIds?.length
          ? { userId: { notIn: input.excludeUserIds } }
          : {}),
      },
      select: { userId: true },
    });

    if (members.length === 0) return;

    const type = input.type || NotificationType.SYSTEM;
    const userIds = members.map((m) => m.userId);

    await db.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: input.title,
        message: input.message,
        type,
        linkUrl: input.linkUrl || null,
      })),
    });

    // Push notifications (non-blocking)
    sendPushNotificationToMultipleUsers(
      userIds,
      input.title,
      input.message,
      undefined,
      input.linkUrl
    ).catch((err) =>
      console.error("Failed to send team push notifications:", err)
    );
  } catch (error) {
    console.error("Failed to notify restaurant team:", error);
  }
}

// Helper functions for common notification scenarios
export async function notifyOwnerRestaurantApproved(
  ownerId: string,
  restaurantName: string
) {
  // Get owner details for SMS
  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { phone: true },
  });

  // Send in-app notification
  const notification = await createNotification({
    userId: ownerId,
    title: "Restaurant Approved!",
    message: `Your restaurant "${restaurantName}" has been approved. You can now book services.`,
    type: NotificationType.SYSTEM,
    linkUrl: "/owner/restaurant/status",
  });

  // Send SMS (non-blocking)
  if (owner?.phone) {
    sendSMSFromTemplate(
      owner.phone,
      "RESTAURANT_APPROVED",
      { restaurantName },
      "RESTAURANT_APPROVED"
    ).catch((error) => {
      console.error("Failed to send restaurant approved SMS:", error);
    });
  }

  return notification;
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
  // Get owner and booking details for email and SMS
  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { name: true, email: true, phone: true },
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

    // Send SMS (non-blocking)
    if (owner.phone) {
      sendSMSFromTemplate(
        owner.phone,
        "PAYMENT_VERIFIED",
        {
          amount: booking.totalAmount.toLocaleString('en-IN'),
          bookingId: bookingId.slice(-8),
        },
        "PAYMENT_VERIFIED"
      ).catch((error) => {
        console.error("Failed to send payment verified SMS:", error);
      });
    }

    // Auto-sync to Khatabook (non-blocking)
    autoSyncBooking(bookingId).catch((error) => {
      console.error("Failed to auto-sync booking to Khatabook:", error);
    });
  }

  // Notify team members (non-blocking)
  if (booking) {
    notifyRestaurantTeam({
      restaurantId: booking.restaurantId,
      excludeUserIds: [ownerId],
      roles: [RestaurantRole.MANAGER, RestaurantRole.ACCOUNTANT],
      title: "Payment Verified",
      message: "Booking payment has been verified. An engineer will be assigned soon.",
      type: NotificationType.PAYMENT,
      linkUrl: "/owner/bookings/" + bookingId,
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

  // Notify team members (non-blocking)
  if (booking) {
    notifyRestaurantTeam({
      restaurantId: booking.restaurantId,
      excludeUserIds: [ownerId],
      roles: [RestaurantRole.MANAGER, RestaurantRole.ACCOUNTANT],
      title: "Payment Rejected",
      message: "Booking payment was rejected. Reason: " + reason,
      type: NotificationType.PAYMENT,
      linkUrl: "/owner/bookings/" + bookingId,
    });
  }

  return notification;
}

export async function notifyOwnerEngineerAssigned(
  ownerId: string,
  bookingId: string,
  engineerName: string,
  engineerPhone?: string
) {
  // Get owner, booking, and engineer details for email and SMS
  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { name: true, email: true, phone: true },
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
      engineerPhone || ""
    ).catch((error) => {
      console.error("Failed to send engineer assigned email:", error);
    });

    // Send SMS (non-blocking)
    if (owner.phone && booking.slotStartDateTime) {
      const slotDate = new Date(booking.slotStartDateTime).toLocaleDateString(
        "en-IN",
        { day: "numeric", month: "short", year: "numeric" }
      );
      sendSMSFromTemplate(
        owner.phone,
        "ENGINEER_ASSIGNED",
        {
          engineerName,
          date: slotDate,
          engineerPhone: engineerPhone || "Not provided",
        },
        "ENGINEER_ASSIGNED"
      ).catch((error) => {
        console.error("Failed to send engineer assigned SMS:", error);
      });
    }
  }

  // Notify team members (non-blocking)
  if (booking) {
    notifyRestaurantTeam({
      restaurantId: booking.restaurantId,
      excludeUserIds: [ownerId],
      roles: [RestaurantRole.MANAGER],
      title: "Engineer Assigned",
      message: engineerName + " has been assigned to a booking.",
      type: NotificationType.BOOKING,
      linkUrl: "/owner/bookings/" + bookingId,
    });
  }

  return notification;
}

export async function notifyOwnerJobCompleted(
  ownerId: string,
  bookingId: string
) {
  const notification = await createNotification({
    userId: ownerId,
    title: "Job Completed",
    message: "Your service booking has been completed.",
    type: NotificationType.BOOKING,
    linkUrl: "/owner/bookings/" + bookingId,
  });

  // Notify team members (non-blocking)
  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    select: { restaurantId: true },
  });
  if (booking) {
    notifyRestaurantTeam({
      restaurantId: booking.restaurantId,
      excludeUserIds: [ownerId],
      roles: [RestaurantRole.MANAGER],
      title: "Job Completed",
      message: "A service booking has been completed.",
      type: NotificationType.BOOKING,
      linkUrl: "/owner/bookings/" + bookingId,
    });
  }

  return notification;
}

export async function notifyEngineerNewJob(
  engineerId: string,
  assignmentId: string,
  restaurantName: string
) {
  // Get engineer, assignment, and booking details for email and SMS
  const engineer = await db.user.findUnique({
    where: { id: engineerId },
    select: { name: true, email: true, phone: true },
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

  // Send email and SMS (non-blocking)
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

    // Send SMS (non-blocking)
    if (engineer.phone && assignment.booking.slotStartDateTime) {
      const booking = assignment.booking;
      const slotDateTime = booking.slotStartDateTime!; // Non-null assertion safe here due to check above
      const slotDate = new Date(slotDateTime).toLocaleDateString(
        "en-IN",
        { day: "numeric", month: "short", year: "numeric" }
      );
      const slotTime = new Date(slotDateTime).toLocaleTimeString(
        "en-IN",
        { hour: "2-digit", minute: "2-digit" }
      );

      sendSMSFromTemplate(
        engineer.phone,
        "ENGINEER_JOB_ASSIGNED",
        {
          bookingId: booking.id.slice(-8),
          date: slotDate,
          time: slotTime,
          address: booking.restaurant.address,
        },
        "ENGINEER_JOB_ASSIGNED"
      ).catch((error) => {
        console.error("Failed to send engineer job assigned SMS:", error);
      });
    }
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
  const notification = await createNotification({
    userId: ownerId,
    title: "Work Started",
    message: `${engineerName} has started working on your service booking.`,
    type: NotificationType.BOOKING,
    linkUrl: "/owner/bookings/" + bookingId,
  });

  // Notify team members (non-blocking)
  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    select: { restaurantId: true },
  });
  if (booking) {
    notifyRestaurantTeam({
      restaurantId: booking.restaurantId,
      excludeUserIds: [ownerId],
      roles: [RestaurantRole.MANAGER],
      title: "Work Started",
      message: `${engineerName} has started working on a service booking.`,
      type: NotificationType.BOOKING,
      linkUrl: "/owner/bookings/" + bookingId,
    });
  }

  return notification;
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

  // Notify team members (non-blocking)
  if (booking) {
    notifyRestaurantTeam({
      restaurantId: booking.restaurantId,
      excludeUserIds: [ownerId],
      roles: [RestaurantRole.MANAGER],
      title: "Service Completed",
      message: "A service booking has been completed successfully.",
      type: NotificationType.BOOKING,
      linkUrl: "/owner/bookings/" + bookingId,
    });
  }

  return notification;
}

/**
 * Notify owner with a service PIN when engineer requests to start/complete work
 */
export async function notifyOwnerServicePin(
  ownerId: string,
  bookingId: string,
  pin: string,
  purpose: "START" | "COMPLETE",
  engineerName: string
) {
  const actionText = purpose === "START" ? "start work" : "complete work";

  const notification = await createNotification({
    userId: ownerId,
    title: `Service PIN: ${pin}`,
    message: `Engineer ${engineerName} wants to ${actionText}. Share this PIN: ${pin} (expires in 10 min)`,
    type: NotificationType.BOOKING,
    linkUrl: "/owner/bookings/" + bookingId,
  });

  // Send SMS to owner (non-blocking)
  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { phone: true },
  });

  if (owner?.phone) {
    sendSMS({
      phone: owner.phone,
      message: `KNI Service PIN: ${pin}. Engineer ${engineerName} wants to ${actionText}. Share this PIN only when engineer is present. Expires in 10 min.`,
      purpose: "SERVICE_PIN",
    }).catch((error) => {
      console.error("Failed to send service PIN SMS:", error);
    });
  }

  return notification;
}
