export type AMCDuration = "MONTHLY" | "QUARTERLY" | "YEARLY";
export type AMCSubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

/**
 * Calculate the end date for an AMC subscription based on start date and duration
 */
export function calculateAMCEndDate(startDate: Date, duration: AMCDuration): Date {
  const endDate = new Date(startDate);

  switch (duration) {
    case "MONTHLY":
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case "QUARTERLY":
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case "YEARLY":
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
  }

  return endDate;
}

/**
 * Check if a subscription is currently valid
 */
export function isSubscriptionValid(endDate: Date | string): boolean {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const now = new Date();
  return end > now;
}

/**
 * Get days remaining in subscription
 */
export function getDaysRemaining(endDate: Date | string): number {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Get subscription status color for badges
 */
export function getAMCStatusColor(status: AMCSubscriptionStatus): "default" | "success" | "warning" | "destructive" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "EXPIRED":
      return "destructive";
    case "CANCELLED":
      return "warning";
    default:
      return "default";
  }
}

/**
 * Get subscription status label
 */
export function getAMCStatusLabel(status: AMCSubscriptionStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "EXPIRED":
      return "Expired";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

/**
 * Get duration label
 */
export function getAMCDurationLabel(duration: AMCDuration): string {
  switch (duration) {
    case "MONTHLY":
      return "Monthly";
    case "QUARTERLY":
      return "Quarterly (3 months)";
    case "YEARLY":
      return "Yearly (12 months)";
    default:
      return duration;
  }
}

/**
 * Calculate service usage percentage
 */
export function getServiceUsagePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Check if subscription has services remaining
 */
export function hasServicesRemaining(used: number, limit: number): boolean {
  return used < limit;
}

/**
 * Get usage status with color coding
 */
export function getUsageStatus(used: number, limit: number): {
  label: string;
  color: "success" | "warning" | "destructive";
  remaining: number;
} {
  const remaining = Math.max(0, limit - used);
  const percentage = getServiceUsagePercentage(used, limit);

  if (percentage >= 100) {
    return {
      label: "Limit Reached",
      color: "destructive",
      remaining: 0,
    };
  } else if (percentage >= 80) {
    return {
      label: `${remaining} remaining`,
      color: "warning",
      remaining,
    };
  } else {
    return {
      label: `${remaining} remaining`,
      color: "success",
      remaining,
    };
  }
}

/**
 * Check if subscription is expiring soon (within 7 days)
 */
export function isExpiringSoon(endDate: Date | string): boolean {
  const daysRemaining = getDaysRemaining(endDate);
  return daysRemaining > 0 && daysRemaining <= 7;
}
