import { db } from "@/server/db";

/**
 * Auto-update statuses for various content types
 * Called automatically when fetching data to ensure statuses are always current
 */

export async function autoUpdateSponsoredContentStatuses() {
  const now = new Date();
  let updated = { activated: 0, deactivated: 0 };

  try {
    // Auto-activate sponsored content that has reached start date
    const activateResult = await db.sponsoredContent.updateMany({
      where: {
        isActive: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      data: { isActive: true },
    });
    updated.activated = activateResult.count;

    // Auto-deactivate sponsored content that has expired
    const deactivateResult = await db.sponsoredContent.updateMany({
      where: {
        isActive: true,
        endDate: { lt: now },
      },
      data: { isActive: false },
    });
    updated.deactivated = deactivateResult.count;
  } catch (error) {
    console.error("Auto-update sponsored content statuses error:", error);
  }

  return updated;
}

export async function autoUpdateSupportTicketStatuses() {
  const now = new Date();
  let updated = { expired: 0 };

  try {
    // Auto-expire support tickets that have been pending for more than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Note: We don't auto-close tickets, but we could mark them as needing attention
    // For now, we'll leave this as a placeholder for future logic

  } catch (error) {
    console.error("Auto-update support ticket statuses error:", error);
  }

  return updated;
}

export async function autoUpdateAllStatuses() {
  const [sponsored, tickets] = await Promise.all([
    autoUpdateSponsoredContentStatuses(),
    autoUpdateSupportTicketStatuses(),
  ]);

  return { sponsored, tickets };
}
