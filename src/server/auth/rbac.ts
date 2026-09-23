import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getSession, type SessionUser } from "./session";
import { getMobileSession } from "./mobile-session";

export async function requireRole(...allowedRoles: Role[]): Promise<SessionUser> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized: Not logged in");
  }

  if (!allowedRoles.includes(session.role)) {
    throw new Error(`Forbidden: Role ${session.role} not allowed`);
  }

  return session;
}

// Mobile-compatible version that accepts request for Bearer token support
export async function requireRoleMobile(request: NextRequest, ...allowedRoles: Role[]): Promise<SessionUser> {
  const session = await getMobileSession(request);

  if (!session) {
    throw new Error("Unauthorized: Not logged in");
  }

  if (!allowedRoles.includes(session.role)) {
    throw new Error(`Forbidden: Role ${session.role} not allowed`);
  }

  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole(Role.ADMIN);
}

export async function requireOwner(): Promise<SessionUser> {
  return requireRole(Role.OWNER);
}

export async function requireVendor(): Promise<SessionUser> {
  return requireRole(Role.VENDOR);
}

export async function requireEngineer(): Promise<SessionUser> {
  return requireRole(Role.ENGINEER);
}

export async function requireSalesman(): Promise<SessionUser> {
  return requireRole(Role.SALESMAN);
}

// Mobile-compatible versions
export async function requireAdminMobile(request: NextRequest): Promise<SessionUser> {
  return requireRoleMobile(request, Role.ADMIN);
}

export async function requireOwnerMobile(request: NextRequest): Promise<SessionUser> {
  return requireRoleMobile(request, Role.OWNER);
}

export async function requireVendorMobile(request: NextRequest): Promise<SessionUser> {
  return requireRoleMobile(request, Role.VENDOR);
}

export async function requireEngineerMobile(request: NextRequest): Promise<SessionUser> {
  return requireRoleMobile(request, Role.ENGINEER);
}

export async function requireApprovedVendor(): Promise<SessionUser> {
  const session = await requireVendor();

  if (session.vendorApprovalStatus !== "APPROVED") {
    throw new Error("Forbidden: Vendor not approved");
  }

  if (!session.hasApprovedLocation) {
    throw new Error("Forbidden: No approved service location");
  }

  const subStatus = session.vendorSubscriptionStatus;
  if (subStatus === "EXPIRED" || subStatus === "BLOCKED") {
    throw new Error("Forbidden: Vendor subscription expired or blocked");
  }

  return session;
}

export async function requireOwnerWithApprovedRestaurant(): Promise<SessionUser> {
  const session = await requireOwner();

  if (!session.hasApprovedRestaurant) {
    throw new Error("Forbidden: No approved restaurant");
  }

  return session;
}

export async function requireApprovedOwner(): Promise<SessionUser> {
  const session = await requireOwner();

  if (session.ownerApprovalStatus && session.ownerApprovalStatus !== "APPROVED") {
    throw new Error("Forbidden: Owner registration not approved");
  }

  return session;
}

export async function requireApprovedOwnerMobile(request: NextRequest): Promise<SessionUser> {
  const session = await requireOwnerMobile(request);

  if (session.ownerApprovalStatus && session.ownerApprovalStatus !== "APPROVED") {
    throw new Error("Forbidden: Owner registration not approved");
  }

  return session;
}

export function getRoleDashboardUrl(role: Role, session?: SessionUser): string {
  switch (role) {
    case Role.ADMIN:
      return "/admin/dashboard";
    case Role.OWNER:
      if (session?.ownerApprovalStatus && session.ownerApprovalStatus !== "APPROVED") {
        return "/register-owner/success";
      }
      if (!session?.hasAnyRestaurant) {
        return "/owner/restaurant/create";
      }
      return "/owner/dashboard";
    case Role.VENDOR:
      if (session?.vendorApprovalStatus !== "APPROVED" || !session?.hasApprovedLocation) {
        return "/vendor/pending";
      }
      if (session?.vendorSubscriptionStatus === "EXPIRED" ||
          session?.vendorSubscriptionStatus === "BLOCKED") {
        return "/vendor/subscription";
      }
      return "/vendor/dashboard";
    case Role.ENGINEER:
      return "/engineer/dashboard";
    case Role.SALESMAN:
      return "/salesman/dashboard";
    default:
      return "/login";
  }
}
