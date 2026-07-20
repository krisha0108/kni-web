import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/rbac";
import { getEffectiveDiscount } from "@/server/pricing/discount";

/**
 * GET /api/admin/owners/[id]/effective-discount?restaurantId=...
 * Preview the discount that would apply if this owner booked this restaurant
 * right now (custom rate override, active offers, or none) — used by the
 * admin direct-booking flow to show an accurate price breakdown before
 * submit. Restaurant-scoped because FIRST_BOOKING offer eligibility is
 * per-restaurant, not per-owner.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json({ ok: false, error: "restaurantId is required" }, { status: 400 });
    }
    const discount = await getEffectiveDiscount({ ownerId: id, restaurantId, totalAmount: 0 });
    return NextResponse.json({ ok: true, data: discount });
  } catch (error) {
    console.error("Get effective discount error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
