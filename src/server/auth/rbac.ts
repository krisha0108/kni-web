import { Role } from "@prisma/client";
import { getSession, type SessionUser } from "./session";

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

export async function requireApprovedVendor(): Promise<SessionUser> {
  const session = await requireVendor();
  
  if (session.vendorApprovalStatus !== "APPROVED") {
    throw new Error("Forbidden: Vendor not approved");
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

export function getRoleDashboardUrl(role: Role, session?: SessionUser): string {
  switch (role) {
    case Role.ADMIN:
      return "/admin/dashboard";
    case Role.OWNER:
      return "/owner/dashboard";
    case Role.VENDOR:
      if (session?.vendorApprovalStatus !== "APPROVED") {
        return "/vendor/pending";
      }
      if (session?.vendorSubscriptionStatus === "EXPIRED" || 
          session?.vendorSubscriptionStatus === "BLOCKED") {
        return "/vendor/subscription";
      }
      return "/vendor/dashboard";
    case Role.ENGINEER:
      return "/engineer/dashboard";
    default:
      return "/login";
  }
}
