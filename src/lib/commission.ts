/**
 * Commission calculation utilities for engineer payouts
 */

/**
 * Calculate commission amount based on booking total and commission rate
 * @param bookingAmount - Total booking amount in rupees
 * @param commissionRate - Commission percentage (default 20%)
 * @returns Commission amount in rupees
 */
export function calculateCommission(
  bookingAmount: number,
  commissionRate: number = 20
): number {
  if (bookingAmount <= 0) {
    return 0;
  }

  if (commissionRate < 0 || commissionRate > 100) {
    throw new Error("Commission rate must be between 0 and 100");
  }

  return Math.floor((bookingAmount * commissionRate) / 100);
}

/**
 * Format amount in rupees
 * @param amount - Amount in rupees
 * @returns Formatted string in rupees
 */
export function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Calculate engineer earnings breakdown
 * @param bookingAmount - Total booking amount in rupees
 * @param commissionRate - Commission percentage
 * @returns Object with total, commission, and platform fee
 */
export function getEarningsBreakdown(
  bookingAmount: number,
  commissionRate: number = 20
) {
  const commission = calculateCommission(bookingAmount, commissionRate);
  const platformFee = bookingAmount - commission;

  return {
    totalAmount: bookingAmount,
    engineerEarnings: commission,
    platformFee,
    commissionRate,
  };
}
