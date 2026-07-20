import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getUserRestaurants } from "@/server/auth/restaurant-rbac";
import { isRedeemable } from "@/server/pricing/discount";

/**
 * GET /api/owner/offers?restaurantId=...
 * Active/upcoming AUTO-APPLY booking offers, so owners know a discount
 * campaign is running before they book — not just the applied line-item at
 * checkout. Code-gated offers are deliberately excluded here (they're meant
 * to be shared out-of-band, e.g. a WhatsApp campaign, not browsable) - enter
 * those directly at checkout instead.
 * FIRST_BOOKING offers are flagged `eligible: false` once the given
 * restaurant has any non-cancelled booking, since they'd no longer actually
 * apply (eligibility is per-restaurant, not per-owner - an owner with an
 * established restaurant still gets the welcome offer on a newly-added
 * restaurant's first order). Without a restaurantId, FIRST_BOOKING
 * eligibility is shown against the owner's oldest/least-booked restaurant
 * so the "you may still be eligible" hint stays useful in a restaurant-less
 * context, but callers that know the active restaurant should pass it.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    const now = new Date();
    const offers = await db.bookingOffer.findMany({
      where: {
        isActive: true,
        code: null,
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: [{ sortOrder: "asc" }, { discountPercent: "desc" }],
      select: {
        id: true,
        name: true,
        type: true,
        discountPercent: true,
        startDate: true,
        endDate: true,
        category: { select: { name: true } },
        imageUrl: true,
        description: true,
        sortOrder: true,
        maxRedemptions: true,
        onePerOwner: true,
      },
    });

    let hasPriorBookings = true;
    if (restaurantId) {
      hasPriorBookings =
        (await db.serviceBooking.count({
          where: { restaurantId, status: { not: "CANCELLED" } },
        })) > 0;
    } else {
      // No restaurant selected yet - eligible if ANY restaurant this owner
      // has access to would still qualify, so the offer isn't hidden before
      // the owner has even picked which restaurant they're booking for.
      const restaurants = await getUserRestaurants(session.id);
      if (restaurants.length > 0) {
        const bookedRestaurantIds = await db.serviceBooking.findMany({
          where: {
            restaurantId: { in: restaurants.map((r) => r.restaurantId) },
            status: { not: "CANCELLED" },
          },
          select: { restaurantId: true },
          distinct: ["restaurantId"],
        });
        hasPriorBookings = bookedRestaurantIds.length >= restaurants.length;
      }
    }

    const data = await Promise.all(
      offers.map(async (offer) => {
        const { maxRedemptions, onePerOwner, ...rest } = offer;
        const notCapped = await isRedeemable({ id: offer.id, maxRedemptions, onePerOwner }, session.id, db);
        return {
          ...rest,
          isUpcoming: offer.startDate ? offer.startDate > now : false,
          eligible: (offer.type === "FIRST_BOOKING" ? !hasPriorBookings : true) && notCapped,
        };
      })
    );

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Get owner offers error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
