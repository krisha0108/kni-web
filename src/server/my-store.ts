import { db } from "./db";

/**
 * Get or create a system vendor profile for the admin user.
 * The system vendor bypasses all approval/subscription/location checks.
 */
export async function getOrCreateSystemVendor(adminUserId: string): Promise<string> {
  // Check if system vendor profile already exists for this admin
  const existing = await db.vendorProfile.findUnique({
    where: { userId: adminUserId },
    select: { isSystemVendor: true },
  });

  if (existing?.isSystemVendor) {
    return adminUserId;
  }

  if (existing && !existing.isSystemVendor) {
    // Profile exists but not marked as system vendor — update it
    await db.vendorProfile.update({
      where: { userId: adminUserId },
      data: { isSystemVendor: true, approvalStatus: "APPROVED", subscriptionStatus: "ACTIVE" },
    });
    return adminUserId;
  }

  // No profile exists — create one
  await db.vendorProfile.create({
    data: {
      userId: adminUserId,
      approvalStatus: "APPROVED",
      subscriptionStatus: "ACTIVE",
      isSystemVendor: true,
    },
  });

  return adminUserId;
}
