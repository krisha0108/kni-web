import { db } from "@/server/db";
import { Role } from "@prisma/client";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  linkUrl?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl || null,
    },
  });
}

export async function createNotificationForRole(
  role: Role,
  title: string,
  message: string,
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
    linkUrl: "/owner/restaurant/status",
  });
}

export async function notifyOwnerPaymentVerified(
  ownerId: string,
  bookingId: string
) {
  return createNotification({
    userId: ownerId,
    title: "Payment Verified",
    message: "Your payment has been verified. An engineer will be assigned soon.",
    linkUrl: "/owner/bookings/" + bookingId,
  });
}

export async function notifyOwnerPaymentRejected(
  ownerId: string,
  bookingId: string,
  reason: string
) {
  return createNotification({
    userId: ownerId,
    title: "Payment Rejected",
    message: "Your payment was rejected. Reason: " + reason,
    linkUrl: "/owner/bookings/" + bookingId,
  });
}

export async function notifyOwnerEngineerAssigned(
  ownerId: string,
  bookingId: string,
  engineerName: string
) {
  return createNotification({
    userId: ownerId,
    title: "Engineer Assigned",
    message: engineerName + " has been assigned to your booking.",
    linkUrl: "/owner/bookings/" + bookingId,
  });
}

export async function notifyOwnerJobCompleted(
  ownerId: string,
  bookingId: string
) {
  return createNotification({
    userId: ownerId,
    title: "Job Completed",
    message: "Your service booking has been completed.",
    linkUrl: "/owner/bookings/" + bookingId,
  });
}

export async function notifyEngineerNewJob(
  engineerId: string,
  assignmentId: string,
  restaurantName: string
) {
  return createNotification({
    userId: engineerId,
    title: "New Job Assignment",
    message: "You have been assigned a job at " + restaurantName + ".",
    linkUrl: "/engineer/jobs/" + assignmentId,
  });
}

export async function notifyVendorApproved(vendorId: string) {
  return createNotification({
    userId: vendorId,
    title: "Account Approved!",
    message: "Your vendor account has been approved. You can now add products.",
    linkUrl: "/vendor/dashboard",
  });
}

export async function notifyVendorRejected(vendorId: string, reason: string) {
  return createNotification({
    userId: vendorId,
    title: "Account Rejected",
    message: "Your vendor application was rejected. Reason: " + reason,
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
    linkUrl: "/owner/bookings/" + bookingId,
  });
}

export async function notifyOwnerServiceCompleted(
  ownerId: string,
  bookingId: string
) {
  return createNotification({
    userId: ownerId,
    title: "Service Completed",
    message: "Your service booking has been completed successfully.",
    linkUrl: "/owner/bookings/" + bookingId,
  });
}
