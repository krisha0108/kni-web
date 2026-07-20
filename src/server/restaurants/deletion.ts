import { db } from "@/server/db";

export class RestaurantNotDeletableError extends Error {}

/**
 * Throws RestaurantNotDeletableError if the restaurant has active bookings
 * or active marketplace orders. Shared by the owner instant-delete path
 * (PENDING/REJECTED restaurants) and the admin deletion-request approval
 * path (APPROVED restaurants).
 */
export async function assertRestaurantDeletable(restaurantId: string): Promise<void> {
  const activeBookings = await db.serviceBooking.count({
    where: {
      restaurantId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
  });

  if (activeBookings > 0) {
    throw new RestaurantNotDeletableError(
      `Cannot delete restaurant with ${activeBookings} active booking(s). Please complete or cancel all bookings first.`
    );
  }

  const activeOrders = await db.marketplaceOrder.count({
    where: {
      restaurantId,
      status: { notIn: ["DELIVERED", "CANCELLED"] },
    },
  });

  if (activeOrders > 0) {
    throw new RestaurantNotDeletableError(
      `Cannot delete restaurant with ${activeOrders} active order(s). Please wait for orders to be delivered or cancel them first.`
    );
  }
}
