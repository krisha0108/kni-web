import { NextRequest } from "next/server";
import { db } from "@/server/db";
import type { SessionUser } from "./session";
import { getSession } from "./session";

/**
 * Get session for mobile apps
 * Checks both cookie-based auth (web) and token-based auth (mobile)
 */
export async function getMobileSession(request?: NextRequest): Promise<SessionUser | null> {
  // Try cookie-based session first (for web and backwards compatibility)
  const cookieSession = await getSession();
  if (cookieSession) {
    return cookieSession;
  }

  // If no cookie session and request provided, try Authorization header (for mobile)
  if (!request) {
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          vendorProfile: true,
          ownerProfile: true,
          restaurants: {
            where: { status: "APPROVED" },
            take: 1,
          },
          restaurantMemberships: {
            where: {
              acceptedAt: { not: null },
              restaurant: { status: "APPROVED" },
            },
            take: 1,
          },
          _count: {
            select: { restaurants: true },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    isActive: session.user.isActive,
    vendorApprovalStatus: session.user.vendorProfile?.approvalStatus ?? null,
    vendorSubscriptionStatus: session.user.vendorProfile?.subscriptionStatus ?? null,
    vendorRevenueModel: session.user.vendorProfile?.revenueModel ?? null,
    ownerApprovalStatus: session.user.ownerProfile?.approvalStatus ?? null,
    hasApprovedRestaurant: session.user.restaurants.length > 0 || session.user.restaurantMemberships.length > 0,
    hasAnyRestaurant: session.user._count.restaurants > 0 || session.user.restaurantMemberships.length > 0,
  };
}
