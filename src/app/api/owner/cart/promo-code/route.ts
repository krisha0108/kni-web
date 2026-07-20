import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { z } from "zod";

const schema = z.object({ code: z.string().trim().min(1).max(40).nullable(), restaurantId: z.string().optional() });

/**
 * PATCH /api/owner/cart/promo-code
 * Attach (or clear, with code: null) a promo code to the owner's draft cart.
 * Not validated here - GET /api/owner/cart re-resolves the discount on every
 * fetch and returns `promoCodeError` if the code turns out to be invalid,
 * expired, or exhausted, so the UI can show that without duplicating the
 * validation rules from getEffectiveDiscount.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ ok: false, error: validation.error.issues[0].message }, { status: 400 });
    }

    // Prefer the caller-supplied restaurantId (an owner with multiple
    // restaurants otherwise silently gets "the first approved one," which
    // may not be the cart they're actually looking at).
    const restaurant = validation.data.restaurantId
      ? await db.restaurant.findFirst({
          where: { id: validation.data.restaurantId, ownerId: session.id, status: "APPROVED" },
        })
      : await db.restaurant.findFirst({ where: { ownerId: session.id, status: "APPROVED" } });
    if (!restaurant) {
      return NextResponse.json({ ok: false, error: "No approved restaurant" }, { status: 400 });
    }

    const cart = await db.cart.findFirst({
      where: { ownerId: session.id, restaurantId: restaurant.id, status: "DRAFT" },
    });
    if (!cart) {
      return NextResponse.json({ ok: false, error: "Cart is empty" }, { status: 400 });
    }

    await db.cart.update({
      where: { id: cart.id },
      data: { promoCode: validation.data.code ? validation.data.code.toUpperCase() : null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Set cart promo code error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
