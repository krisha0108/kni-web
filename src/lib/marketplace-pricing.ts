// Split-payment ratio for negotiated (quote-based) marketplace orders.
// Advance is paid when the owner confirms the quote; the remainder is paid
// once the order is marked Delivered.
export const MARKETPLACE_ADVANCE_PERCENT = 30;

export function computeMarketplaceAdvance(totalAmount: number): number {
  return Math.round((totalAmount * MARKETPLACE_ADVANCE_PERCENT) / 100);
}

export interface NegotiatedPriceInputs {
  price: number;
  priceOnRequest: boolean;
}

export interface PriceUnlockInputs {
  unlockedPrice: number | null;
  validUntil: Date | null;
}

/**
 * Resolves the price to charge for a product, accounting for a negotiated
 * (price-unlock) quote. Centralizes logic that used to be copy-pasted across
 * cart/orders/payments/razorpay-verify routes so a fix only needs to land
 * once.
 */
export function resolveNegotiatedPrice(
  product: NegotiatedPriceInputs,
  unlock: PriceUnlockInputs | null | undefined
): { price: number; isNegotiated: boolean; expired: boolean } {
  if (!product.priceOnRequest || !unlock || !unlock.unlockedPrice) {
    return { price: product.price, isNegotiated: false, expired: false };
  }

  const expired = !!unlock.validUntil && unlock.validUntil < new Date();
  if (expired) {
    return { price: product.price, isNegotiated: false, expired: true };
  }

  return { price: unlock.unlockedPrice, isNegotiated: true, expired: false };
}

/**
 * Caps a requested purchase quantity to the amount the admin actually priced
 * for (PriceUnlockRequest.quantity), falling back to available stock when the
 * owner didn't specify a quantity on the original request.
 */
export function clampQuantityToUnlock(
  requestedQty: number,
  unlock: { quantity: number | null },
  stockQty: number
): number {
  const cap = Math.min(stockQty, unlock.quantity ?? stockQty);
  return Math.max(1, Math.min(requestedQty, cap));
}
