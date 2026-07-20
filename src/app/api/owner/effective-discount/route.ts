import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getEffectiveDiscount } from "@/server/pricing/discount";

/**
 * GET /api/owner/effective-discount?restaurantId=...&amount=...&categoryId=...&promoCode=...
 * (or &categorySubtotals=<JSON map of categoryId to amount>, for previews
 * that span multiple categories - e.g. a multi-item cart with some items
 * deselected, where a single categoryId/amount pair can't represent it)
 *
 * Discount the logged-in owner would get on their next booking for the given
 * restaurant (custom rate override, active offer/code, or none) - for pricing
 * previews on booking flows that don't go through the cart (e.g. the
 * single-equipment request-service flow, where every item shares one
 * category), so the price shown before checkout matches what actually gets
 * charged/stored on the booking. Restaurant-scoped because FIRST_BOOKING
 * offer eligibility is per-restaurant, not per-owner. `amount`/`categoryId`
 * are optional - without them, only whole-booking (non-category) candidates
 * are considered.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const params = request.nextUrl.searchParams;
    const restaurantId = params.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json({ ok: false, error: "restaurantId is required" }, { status: 400 });
    }
    const totalAmount = Number(params.get("amount") || 0);
    const categoryId = params.get("categoryId");
    const categorySubtotalsParam = params.get("categorySubtotals");
    const promoCode = params.get("promoCode") || undefined;

    let categorySubtotals: Record<string, number> | undefined = categoryId
      ? { [categoryId]: totalAmount }
      : undefined;
    if (categorySubtotalsParam) {
      try {
        const parsed = JSON.parse(categorySubtotalsParam);
        if (parsed && typeof parsed === "object") {
          categorySubtotals = parsed;
        }
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid categorySubtotals" }, { status: 400 });
      }
    }

    const discount = await getEffectiveDiscount({
      ownerId: session.id,
      restaurantId,
      totalAmount,
      categorySubtotals,
      promoCode,
    });
    return NextResponse.json({ ok: true, data: discount });
  } catch (error) {
    console.error("Get owner effective discount error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
