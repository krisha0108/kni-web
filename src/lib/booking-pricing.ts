// Pure pricing math for service/parts bookings — no server-only imports, so
// this is safe to import from both API routes and client-side preview pages.

const GST_RATE = 0.18;

export interface BookingTotalBreakdown {
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  discountedBase: number;
  gstAmount: number;
  tipAmount: number;
  totalAmount: number;
}

/**
 * baseAmount -> apply discount -> apply GST (on the discounted base) -> add tip.
 *
 * Takes the discount as a raw rupee amount, not a %. A category-scoped
 * BookingOffer's savings, re-expressed as a whole-number % of the WHOLE
 * booking and then re-derived back into rupees, can drift by hundreds of
 * rupees on a large booking (e.g. 20.83% rounds to 21%, which is ₹1000 off
 * on a ₹6,00,000 base) - so `discountPercent` here is a DISPLAY label only,
 * computed from the real amount, never the other way around.
 */
export function computeBookingTotal(
  baseAmount: number,
  discountAmount: number,
  tipAmount: number
): BookingTotalBreakdown {
  // Never let a stale/larger-scope discount amount (e.g. computed against a
  // bigger base than what's actually being priced right now) push the
  // discounted base negative.
  discountAmount = Math.max(0, Math.min(discountAmount, baseAmount));
  const discountedBase = baseAmount - discountAmount;
  const gstAmount = Math.round(discountedBase * GST_RATE);
  const totalAmount = discountedBase + gstAmount + tipAmount;
  const discountPercent = baseAmount > 0 ? Math.round((discountAmount / baseAmount) * 100) : 0;

  return {
    baseAmount,
    discountPercent,
    discountAmount,
    discountedBase,
    gstAmount,
    tipAmount,
    totalAmount,
  };
}

/** categoryId -> summed (price * qty) for category-scoped BookingOffer matching. */
export function computeCategorySubtotals(items: Array<{ categoryId: string; amount: number }>): Record<string, number> {
  const subtotals: Record<string, number> = {};
  for (const item of items) {
    subtotals[item.categoryId] = (subtotals[item.categoryId] ?? 0) + item.amount;
  }
  return subtotals;
}
