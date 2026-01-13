import { db } from "@/server/db";
import { type SessionUser } from "./session";
import { RestaurantRole } from "@prisma/client";

export interface RestaurantAccess {
  restaurantId: string;
  role: RestaurantRole;
  isOwner: boolean;
}

/**
 * Permission matrix for restaurant roles
 * Maps permissions to allowed roles
 */
export const RESTAURANT_PERMISSIONS = {
  // Resource: bookings
  "bookings:create": [RestaurantRole.OWNER, RestaurantRole.MANAGER],
  "bookings:read": [RestaurantRole.OWNER, RestaurantRole.MANAGER, RestaurantRole.ACCOUNTANT, RestaurantRole.VIEWER],
  "bookings:update": [RestaurantRole.OWNER, RestaurantRole.MANAGER],
  "bookings:delete": [RestaurantRole.OWNER],

  // Resource: marketplace orders
  "marketplace:create": [RestaurantRole.OWNER, RestaurantRole.MANAGER],
  "marketplace:read": [RestaurantRole.OWNER, RestaurantRole.MANAGER, RestaurantRole.ACCOUNTANT, RestaurantRole.VIEWER],

  // Resource: equipment
  "equipment:create": [RestaurantRole.OWNER, RestaurantRole.MANAGER],
  "equipment:read": [RestaurantRole.OWNER, RestaurantRole.MANAGER, RestaurantRole.ACCOUNTANT, RestaurantRole.VIEWER],
  "equipment:update": [RestaurantRole.OWNER, RestaurantRole.MANAGER],
  "equipment:delete": [RestaurantRole.OWNER],

  // Resource: AMC subscriptions
  "amc:create": [RestaurantRole.OWNER, RestaurantRole.MANAGER],
  "amc:read": [RestaurantRole.OWNER, RestaurantRole.MANAGER, RestaurantRole.ACCOUNTANT, RestaurantRole.VIEWER],
  "amc:update": [RestaurantRole.OWNER, RestaurantRole.MANAGER],
  "amc:cancel": [RestaurantRole.OWNER],

  // Resource: expenses
  "expenses:create": [RestaurantRole.OWNER, RestaurantRole.MANAGER, RestaurantRole.ACCOUNTANT],
  "expenses:read": [RestaurantRole.OWNER, RestaurantRole.MANAGER, RestaurantRole.ACCOUNTANT, RestaurantRole.VIEWER],
  "expenses:update": [RestaurantRole.OWNER, RestaurantRole.ACCOUNTANT],
  "expenses:delete": [RestaurantRole.OWNER],

  // Resource: team management
  "team:invite": [RestaurantRole.OWNER],
  "team:read": [RestaurantRole.OWNER, RestaurantRole.MANAGER],
  "team:update": [RestaurantRole.OWNER],
  "team:remove": [RestaurantRole.OWNER],

  // Resource: restaurant settings
  "restaurant:update": [RestaurantRole.OWNER],
  "restaurant:delete": [RestaurantRole.OWNER],
} as const;

export type Permission = keyof typeof RESTAURANT_PERMISSIONS;

/**
 * Get restaurant access for a user
 * Returns owner status or team member role
 */
export async function getRestaurantAccess(
  userId: string,
  restaurantId: string
): Promise<RestaurantAccess | null> {
  // Check if user is the restaurant owner
  const restaurant = await db.restaurant.findFirst({
    where: {
      id: restaurantId,
      ownerId: userId,
      status: "APPROVED",
    },
  });

  if (restaurant) {
    return {
      restaurantId,
      role: RestaurantRole.OWNER,
      isOwner: true,
    };
  }

  // Check if user is a team member
  const membership = await db.restaurantMember.findFirst({
    where: {
      restaurantId,
      userId,
      acceptedAt: { not: null },
      restaurant: { status: "APPROVED" },
    },
  });

  if (membership) {
    return {
      restaurantId,
      role: membership.role,
      isOwner: false,
    };
  }

  return null;
}

/**
 * Check if user has specific permission for a restaurant
 */
export function hasPermission(
  access: RestaurantAccess,
  permission: Permission
): boolean {
  const allowedRoles = RESTAURANT_PERMISSIONS[permission] as readonly RestaurantRole[];
  return allowedRoles.includes(access.role);
}

/**
 * Get all restaurants accessible by a user with their roles
 */
export async function getUserRestaurants(
  userId: string
): Promise<Array<{ restaurantId: string; role: RestaurantRole; restaurant: any }>> {
  const ownedRestaurants = await db.restaurant.findMany({
    where: {
      ownerId: userId,
      status: "APPROVED",
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      pincode: true,
      restaurantImageUrl: true,
    },
  });

  const memberships = await db.restaurantMember.findMany({
    where: {
      userId,
      acceptedAt: { not: null },
      restaurant: { status: "APPROVED" },
    },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          pincode: true,
          restaurantImageUrl: true,
        },
      },
    },
  });

  return [
    ...ownedRestaurants.map((r) => ({
      restaurantId: r.id,
      role: RestaurantRole.OWNER,
      restaurant: r,
    })),
    ...memberships.map((m) => ({
      restaurantId: m.restaurantId,
      role: m.role,
      restaurant: m.restaurant,
    })),
  ];
}

/**
 * Require restaurant access with specific permission
 * Throws error if access denied
 */
export async function requireRestaurantAccess(
  session: SessionUser,
  restaurantId: string,
  permission: Permission
): Promise<RestaurantAccess> {
  const access = await getRestaurantAccess(session.id, restaurantId);

  if (!access) {
    throw new Error("Access denied: Not a member of this restaurant");
  }

  if (!hasPermission(access, permission)) {
    throw new Error(
      `Access denied: ${access.role} role cannot perform ${permission}`
    );
  }

  return access;
}

/**
 * Middleware helper for API routes
 * Validates restaurant access and returns access object
 */
export async function withRestaurantAccess(
  session: SessionUser,
  restaurantId: string,
  permission: Permission
): Promise<RestaurantAccess> {
  return requireRestaurantAccess(session, restaurantId, permission);
}
