import { cookies } from "next/headers";
import { db } from "@/server/db";
import { v4 as uuidv4 } from "uuid";
import type { User, Role, VendorApprovalStatus, VendorSubscriptionStatus, VendorRevenueModel, OwnerApprovalStatus } from "@prisma/client";

const SESSION_COOKIE_NAME = "kni_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Where each role lands when it hits a section it's not authorized for
// (e.g. a SALESMAN opening an /admin/* URL gets bounced here instead of /login).
export const ROLE_HOME_PATH: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  OWNER: "/owner/dashboard",
  VENDOR: "/vendor/dashboard",
  ENGINEER: "/engineer/dashboard",
  SALESMAN: "/salesman/dashboard",
};

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  vendorApprovalStatus?: VendorApprovalStatus | null;
  vendorSubscriptionStatus?: VendorSubscriptionStatus | null;
  vendorRevenueModel?: VendorRevenueModel | null;
  vendorTrialEndsAt?: Date | null;
  vendorActiveUntil?: Date | null;
  ownerApprovalStatus?: OwnerApprovalStatus | null;
  hasApprovedRestaurant?: boolean;
  hasAnyRestaurant?: boolean;
  hasApprovedLocation?: boolean;
  mustChangePassword: boolean;
}

export async function createSession(userId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

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
          vendorLocationRequests: {
            where: { status: "APPROVED" },
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
    vendorTrialEndsAt: session.user.vendorProfile?.trialEndsAt ?? null,
    vendorActiveUntil: session.user.vendorProfile?.activeUntil ?? null,
    ownerApprovalStatus: session.user.ownerProfile?.approvalStatus ?? null,
    hasApprovedRestaurant: session.user.restaurants.length > 0 || session.user.restaurantMemberships.length > 0,
    hasAnyRestaurant: session.user._count.restaurants > 0 || session.user.restaurantMemberships.length > 0,
    hasApprovedLocation: session.user.vendorLocationRequests.length > 0,
    mustChangePassword: session.user.mustChangePassword,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.session.deleteMany({ where: { token } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
