import { db } from "@/server/db";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * After a service booking is completed, check if the equipment has an active AMC.
 * If yes, increment servicesUsed and create an AMCServiceUse record.
 * Notify owner if services are running low or exhausted.
 */
export async function updateAMCOnBookingComplete(bookingId: string) {
  try {
    const booking = await db.serviceBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        ownerId: true,
        equipmentId: true,
        equipment: { select: { name: true } },
      },
    });

    // No equipment linked to this booking - skip
    if (!booking?.equipmentId) return;

    // Find active AMC for this equipment
    const activeAmc = await db.aMCSubscription.findFirst({
      where: {
        equipmentId: booking.equipmentId,
        status: "ACTIVE",
        endDate: { gt: new Date() },
      },
    });

    // No active AMC - skip
    if (!activeAmc) return;

    // Increment servicesUsed
    const updated = await db.aMCSubscription.update({
      where: { id: activeAmc.id },
      data: { servicesUsed: { increment: 1 } },
    });

    // Create AMCServiceUse record
    await db.aMCServiceUse.create({
      data: {
        subscriptionId: activeAmc.id,
        bookingId: booking.id,
        serviceDate: new Date(),
        serviceType: "Service Booking",
        notes: `Auto-recorded from completed booking #${booking.id.substring(0, 8)}`,
      },
    });

    const equipmentName = booking.equipment?.name || "Equipment";
    const servicesUsed = updated.servicesUsed;
    const serviceLimit = updated.serviceLimit;
    const remaining = serviceLimit - servicesUsed;

    // Notify if services exhausted
    if (servicesUsed >= serviceLimit) {
      await createNotification({
        userId: booking.ownerId,
        title: "AMC Services Exhausted",
        message: `All ${serviceLimit} services for "${equipmentName}" AMC have been used. Please renew your AMC plan.`,
        type: NotificationType.AMC,
        linkUrl: `/owner/equipment/${booking.equipmentId}`,
      });
    }
    // Notify if 80% or more used
    else if (servicesUsed >= Math.floor(serviceLimit * 0.8)) {
      await createNotification({
        userId: booking.ownerId,
        title: "AMC Services Running Low",
        message: `Only ${remaining} out of ${serviceLimit} services remaining for "${equipmentName}" AMC.`,
        type: NotificationType.AMC,
        linkUrl: `/owner/equipment/${booking.equipmentId}`,
      });
    }
  } catch (error) {
    // Don't fail the booking completion if AMC update fails
    console.error("AMC auto-update error:", error);
  }
}
