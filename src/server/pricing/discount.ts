import { db } from "@/server/db";
import type { Prisma, PrismaClient, BookingOffer } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

/** One eligible discount option - either the auto-picked winner or one entry
 * in `candidates` for the owner to choose from instead. */
export interface DiscountCandidate {
  /** null for the custom-rate override and the always-present "no discount"
   * option (neither is a redeemable BookingOffer). */
  offerId: string | null;
  /** Display label, e.g. "Offer: test2" or "No discount". */
  source: string;
  /** Display-only % - see the note on EffectiveDiscount.percent. */
  percent: number;
  /** Authoritative rupee savings for THIS candidate against the current cart. */
  amount: number;
}

export interface EffectiveDiscount {
  /** Display-only equivalent % of the whole booking - do NOT re-derive
   * discountAmount from this (whole-number rounding drifts real rupees on
   * large/category-scoped discounts). Use `amount` for the actual charge. */
  percent: number;
  /** Authoritative rupee savings - pass this to computeBookingTotal. */
  amount: number;
  source: string;
  /** Set when the winning candidate is a redeemable BookingOffer - callers
   * that create a booking must record a BookingOfferRedemption row for it
   * (inside the same transaction) so maxRedemptions/onePerOwner stay correct. */
  offerId?: string;
  /** Every eligible option for this cart (custom rate, auto-apply offers, the
   * validated promo code, plus a "No discount" floor) - always populated,
   * regardless of whether the caller picked one via ctx.selectedOfferId, so a
   * checkout screen can render the full list and let the owner choose. */
  candidates: DiscountCandidate[];
  /** Set when ctx.selectedOfferId was supplied but isn't (or is no longer) an
   * eligible candidate for this cart - e.g. it hit maxRedemptions between
   * preview and submit. Callers MUST treat this as an error and refuse to
   * book rather than silently charging a different amount than the owner
   * picked; `amount`/`source`/`offerId` fall back to "No discount" in this case. */
  selectedOfferInvalid?: boolean;
  /** Set when ctx.promoCode was supplied but didn't validate - callers should
   * surface this as an error rather than silently booking without it. */
  promoCodeError?: string;
  /** Set when ctx.promoCode was supplied AND validated, but a bigger discount
   * (already-active offer or custom rate) won instead - so the code had no
   * extra effect this time. Without this, a valid-but-outbid code looks
   * indistinguishable from a broken one (the response just shows the winner,
   * with no mention of the code at all). Not an error - the code worked. */
  promoCodeOutbidBy?: string;
}

export interface DiscountContext {
  ownerId: string;
  restaurantId: string;
  /** Whole booking base amount (pre-GST, pre-tip). */
  totalAmount: number;
  /** categoryId -> base amount from items in that category, for category-scoped offers.
   * Omit (or leave a category out) if unknown - category-scoped offers simply
   * won't be considered for that category. */
  categorySubtotals?: Record<string, number>;
  /** Code the owner entered, if any. */
  promoCode?: string;
  /** Owner's explicit choice among the eligible candidates, from a prior
   * preview call's `candidates` list. `null` = "I want no discount" even if a
   * better one is available. Omit entirely to keep the default auto-best
   * behavior (today's callers that don't offer a picker). */
  selectedOfferId?: string | null;
}

export async function isRedeemable(
  offer: Pick<BookingOffer, "id" | "maxRedemptions" | "onePerOwner">,
  ownerId: string,
  client: DbClient
): Promise<boolean> {
  if (offer.maxRedemptions != null) {
    const count = await client.bookingOfferRedemption.count({ where: { offerId: offer.id } });
    if (count >= offer.maxRedemptions) return false;
  }
  if (offer.onePerOwner) {
    const count = await client.bookingOfferRedemption.count({ where: { offerId: offer.id, ownerId } });
    if (count > 0) return false;
  }
  return true;
}

async function restaurantHasPriorBookings(restaurantId: string, client: DbClient): Promise<boolean> {
  const count = await client.serviceBooking.count({
    where: { restaurantId, status: { not: "CANCELLED" } },
  });
  return count > 0;
}

/**
 * Effective discount for a booking: the candidate with the BEST rupee savings
 * (not raw %, since category-scoped offers only compete on a slice of the
 * booking) among —
 *   - the owner's custom rate override (User.serviceDiscountPercent) - whole-booking, never category-scoped
 *   - any currently-active, auto-apply BookingOffer (no `code` set)
 *     (FIRST_BOOKING offers only count if THIS RESTAURANT has no prior
 *     bookings yet; category-scoped offers (categoryId set) only count
 *     savings against that category's subtotal; maxRedemptions/onePerOwner
 *     offers that are exhausted are skipped)
 *   - the offer matching ctx.promoCode, if supplied and valid (same rules as above)
 *   - 0% (baseline, when nothing else applies)
 * The winning rupee savings is converted back to an equivalent % of the
 * whole booking (existing ServiceBooking.discountPercent/discountAmount
 * snapshot fields stay single-value - no stacking). All eligible candidates
 * are always returned via `candidates`, and `ctx.selectedOfferId` lets a
 * caller override which one wins (for a "pick your own offer" checkout UI)
 * instead of always auto-picking the best.
 *
 * Pass a transaction client (`tx`) to keep this read - and any redemption
 * cap checks - inside an in-flight `db.$transaction`, which callers MUST do
 * if they also write a BookingOfferRedemption row afterward (otherwise two
 * concurrent bookings could both pass a maxRedemptions check before either
 * one's redemption row is visible to the other).
 */
export async function getEffectiveDiscount(
  ctx: DiscountContext,
  client: DbClient = db
): Promise<EffectiveDiscount> {
  const { ownerId, restaurantId, totalAmount, categorySubtotals = {}, promoCode } = ctx;

  // Some callers preview the discount before the owner has picked any items
  // yet (totalAmount unknowable). In that case there's no rupee amount to
  // compare candidates by, so fall back to comparing raw % and skip
  // category-scoped offers entirely (their eligibility can't be known yet).
  const amountKnown = totalAmount > 0;

  const savingsFor = (offer: Pick<BookingOffer, "discountPercent" | "categoryId">) => {
    if (!amountKnown) return offer.categoryId ? 0 : offer.discountPercent;
    const base = offer.categoryId ? categorySubtotals[offer.categoryId] ?? 0 : totalAmount;
    return Math.round((base * offer.discountPercent) / 100);
  };

  // `offerId` is set ONLY for real, redeemable BookingOffers - callers use it
  // to write a BookingOfferRedemption row, so it must never point at
  // anything else. `selectionKey` is the separate, always-present identity
  // used for ctx.selectedOfferId matching and the public `candidates[].offerId`
  // - "custom-rate" and "none" are synthetic (never real BookingOffer ids),
  // so a picked custom rate and a picked "no discount" stay distinguishable
  // even though neither has a real `offerId`.
  type Candidate = { percent: number; source: string; savings: number; offerId?: string; selectionKey: string | null };
  const candidates: Candidate[] = [];

  const owner = await client.user.findUnique({
    where: { id: ownerId },
    select: { serviceDiscountPercent: true },
  });
  if (owner?.serviceDiscountPercent != null) {
    candidates.push({
      percent: owner.serviceDiscountPercent,
      source: "Custom rate",
      savings: amountKnown ? Math.round((totalAmount * owner.serviceDiscountPercent) / 100) : owner.serviceDiscountPercent,
      selectionKey: "custom-rate",
    });
  }

  const now = new Date();
  const dateWindow = {
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
    ],
  };

  let priorBookingsChecked: boolean | null = null;
  const hasPriorBookings = async () => {
    if (priorBookingsChecked === null) {
      priorBookingsChecked = await restaurantHasPriorBookings(restaurantId, client);
    }
    return priorBookingsChecked;
  };

  const autoOffers = await client.bookingOffer.findMany({
    where: { isActive: true, code: null, ...dateWindow },
  });

  for (const offer of autoOffers) {
    if (offer.type === "FIRST_BOOKING" && (await hasPriorBookings())) continue;
    if (!(await isRedeemable(offer, ownerId, client))) continue;
    const savings = savingsFor(offer);
    if (savings <= 0) continue;
    candidates.push({
      percent: offer.discountPercent,
      source: `${offer.type === "FIRST_BOOKING" ? "First Booking Offer" : "Offer"}: ${offer.name}`,
      savings,
      offerId: offer.id,
      selectionKey: offer.id,
    });
  }

  let promoCodeError: string | undefined;
  let codeCandidateId: string | undefined;
  if (promoCode) {
    const normalizedCode = promoCode.trim().toUpperCase();
    const codeOffer = await client.bookingOffer.findFirst({ where: { code: normalizedCode } });

    if (!codeOffer) {
      promoCodeError = "Invalid promo code";
    } else if (!codeOffer.isActive) {
      promoCodeError = "This code is no longer active";
    } else if (codeOffer.startDate && codeOffer.startDate > now) {
      promoCodeError = "This code is not active yet";
    } else if (codeOffer.endDate && codeOffer.endDate < now) {
      promoCodeError = "This code has expired";
    } else if (codeOffer.type === "FIRST_BOOKING" && (await hasPriorBookings())) {
      promoCodeError = "This code is only valid for a restaurant's first booking";
    } else if (!(await isRedeemable(codeOffer, ownerId, client))) {
      promoCodeError = "This code has reached its redemption limit";
    } else {
      const savings = savingsFor(codeOffer);
      if (savings <= 0) {
        promoCodeError = "This code doesn't apply to any items in this booking";
      } else {
        codeCandidateId = codeOffer.id;
        candidates.push({ percent: codeOffer.discountPercent, source: `Promo code: ${codeOffer.name}`, savings, offerId: codeOffer.id, selectionKey: codeOffer.id });
      }
    }
  }

  const noDiscountCandidate: Candidate = { percent: 0, source: "No discount", savings: 0, selectionKey: "none" };
  candidates.push(noDiscountCandidate);
  candidates.sort((a, b) => b.savings - a.savings);

  // Display % per candidate uses the same "against the whole booking" basis
  // as the winner's percent below, so a category-scoped offer's card doesn't
  // overstate its actual effect just because savingsFor() used a slice.
  const displayPercent = (c: Candidate) =>
    amountKnown ? Math.min(100, Math.round((c.savings / totalAmount) * 100)) : c.percent;
  const candidatesOut: DiscountCandidate[] = candidates.map((c) => ({
    offerId: c.selectionKey === "none" ? null : c.selectionKey,
    source: c.source,
    percent: displayPercent(c),
    amount: amountKnown ? c.savings : 0,
  }));

  let winner: Candidate;
  let selectedOfferInvalid: boolean | undefined;
  if (ctx.selectedOfferId === undefined) {
    // No picker in play - keep today's auto-best behavior.
    winner = candidates[0];
  } else {
    const wantedKey = ctx.selectedOfferId === null ? "none" : ctx.selectedOfferId;
    const match = candidates.find((c) => c.selectionKey === wantedKey);
    if (match) {
      winner = match;
    } else {
      // Requested candidate isn't (or is no longer) eligible for this cart -
      // e.g. it hit maxRedemptions between preview and submit. Don't silently
      // substitute a different discount than what the owner picked.
      winner = noDiscountCandidate;
      selectedOfferInvalid = true;
    }
  }

  // Code validated fine but something else pays out more - not an error, but
  // worth telling the owner so a valid code doesn't look silently ignored.
  const promoCodeOutbidBy = codeCandidateId && winner.offerId !== codeCandidateId ? winner.source : undefined;

  if (winner.savings <= 0) {
    return { percent: 0, amount: 0, source: "No discount", candidates: candidatesOut, selectedOfferInvalid, promoCodeError, promoCodeOutbidBy };
  }

  if (!amountKnown) {
    // No real base amount to express savings against yet - just report the
    // winning candidate's own % for display; `amount` is meaningless here.
    return { percent: winner.percent, amount: 0, source: winner.source, offerId: winner.offerId, candidates: candidatesOut, selectedOfferInvalid, promoCodeError, promoCodeOutbidBy };
  }

  // Display-only %: a category-scoped offer's raw % overstates its actual
  // effect once expressed against the whole booking. `amount` (winner.savings)
  // is the real number callers must use.
  const percent = Math.min(100, Math.round((winner.savings / totalAmount) * 100));
  return { percent, amount: winner.savings, source: winner.source, offerId: winner.offerId, candidates: candidatesOut, selectedOfferInvalid, promoCodeError, promoCodeOutbidBy };
}
