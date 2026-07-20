import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { createNotificationForRole } from "@/server/notifications/service";
import { Role, NotificationType } from "@prisma/client";
import { z } from "zod";

const requestPriceSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  vendorProductId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive().optional(),
  message: z.string().max(500).optional(),
  // When the product's list price is already visible, the owner proposes
  // their own price directly instead of blindly "requesting" a price they
  // can already see - skips straight to COUNTERED so admin reviews an
  // actual number, not a blank ask. Omitted for "Price on Request" products
  // where the price is genuinely unknown until admin sets one.
  proposedPrice: z.number().int().positive().optional(),
});

/**
 * POST /api/owner/marketplace/price-requests
 * Owner submits a price negotiation request - either a blank request (for
 * "Price on Request" products, where admin must set the first price) or a
 * direct counter-offer (proposedPrice, for products whose list price is
 * already visible).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const body = await request.json();
    const validation = requestPriceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, vendorProductId, quantity, message, proposedPrice } = validation.data;

    // Verify restaurant access
    const access = await getRestaurantAccess(session.id, restaurantId);
    if (!access) {
      return NextResponse.json(
        { ok: false, error: "Access denied to this restaurant" },
        { status: 403 }
      );
    }

    // Verify product exists, is active, and belongs to a KNI Official Store
    // vendor - negotiation is available on any such product, independent of
    // whether admin has also flagged it "Price on Request" (that flag only
    // controls whether the list price is hidden until unlocked).
    const vendorProduct = await db.vendorProduct.findUnique({
      where: { id: vendorProductId },
      include: {
        product: { select: { name: true } },
        vendor: {
          select: {
            vendorProfile: { select: { isSystemVendor: true } },
          },
        },
      },
    });

    if (!vendorProduct || !vendorProduct.isActive || vendorProduct.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Product not found or unavailable" },
        { status: 404 }
      );
    }

    if (!vendorProduct.vendor.vendorProfile?.isSystemVendor) {
      return NextResponse.json(
        { ok: false, error: "Price requests are only available for KNI Official Store products" },
        { status: 400 }
      );
    }

    // Check for existing request (restaurant-scoped: the same owner
    // negotiating the same product for a different restaurant is a
    // separate request, not a silent reassignment of the first one)
    const existing = await db.priceUnlockRequest.findUnique({
      where: {
        ownerId_restaurantId_vendorProductId: {
          ownerId: session.id,
          restaurantId,
          vendorProductId,
        },
      },
    });

    if (existing) {
      if (existing.status === "PENDING") {
        return NextResponse.json(
          { ok: false, error: "You already have a pending price request for this product" },
          { status: 400 }
        );
      }

      if (existing.status === "COUNTERED") {
        return NextResponse.json(
          { ok: false, error: "You already have a counter-offer awaiting admin's response for this product" },
          { status: 400 }
        );
      }

      if (existing.status === "UNLOCKED") {
        // Check if still valid
        if (!existing.validUntil || existing.validUntil > new Date()) {
          return NextResponse.json(
            { ok: false, error: "Price is already unlocked for this product" },
            { status: 400 }
          );
        }
        // Expired — allow re-request by updating existing record
      }

      // DECLINED or expired UNLOCKED — reset to PENDING (or straight to
      // COUNTERED if the owner proposed their own price)
      const updated = await db.priceUnlockRequest.update({
        where: { id: existing.id },
        data: {
          restaurantId,
          quantity: quantity || null,
          message: message || null,
          status: proposedPrice ? "COUNTERED" : "PENDING",
          unlockedPrice: null,
          ownerCounterPrice: proposedPrice || null,
          validUntil: null,
          adminNote: null,
        },
      });

      // Get owner & restaurant info for notification
      const restaurant = await db.restaurant.findUnique({
        where: { id: restaurantId },
        select: { name: true },
      });

      // Notify admins
      createNotificationForRole(
        Role.ADMIN,
        proposedPrice ? "New Price Offer" : "New Price Request",
        `${session.name} from ${restaurant?.name || "Unknown"} ${proposedPrice ? `offered ₹${proposedPrice.toLocaleString("en-IN")} for` : "requested price for"} "${vendorProduct.product?.name || "Unknown"}"${quantity ? ` (Qty: ${quantity})` : ""}`,
        NotificationType.ORDER,
        "/admin/my-store/price-requests"
      ).catch(console.error);

      return NextResponse.json({ ok: true, data: updated });
    }

    // Create new request
    const priceRequest = await db.priceUnlockRequest.create({
      data: {
        ownerId: session.id,
        restaurantId,
        vendorProductId,
        quantity: quantity || null,
        message: message || null,
        status: proposedPrice ? "COUNTERED" : "PENDING",
        ownerCounterPrice: proposedPrice || null,
      },
    });

    // Get restaurant info for notification
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true },
    });

    // Notify admins
    createNotificationForRole(
      Role.ADMIN,
      proposedPrice ? "New Price Offer" : "New Price Request",
      `${session.name} from ${restaurant?.name || "Unknown"} ${proposedPrice ? `offered ₹${proposedPrice.toLocaleString("en-IN")} for` : "requested price for"} "${vendorProduct.product?.name || "Unknown"}"${quantity ? ` (Qty: ${quantity})` : ""}`,
      NotificationType.ORDER,
      "/admin/my-store/price-requests"
    ).catch(console.error);

    return NextResponse.json({ ok: true, data: priceRequest }, { status: 201 });
  } catch (error) {
    console.error("Create price request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * GET /api/owner/marketplace/price-requests?restaurantId=X
 * Owner lists their price requests
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    const access = await getRestaurantAccess(session.id, restaurantId);
    if (!access) {
      return NextResponse.json(
        { ok: false, error: "Access denied to this restaurant" },
        { status: 403 }
      );
    }

    const requests = await db.priceUnlockRequest.findMany({
      where: { ownerId: session.id },
      include: {
        product: {
          include: {
            product: {
              select: { name: true, imageUrl: true, unit: true },
            },
          },
        },
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = requests.map((r) => ({
      id: r.id,
      vendorProductId: r.vendorProductId,
      productName: r.product.product?.name || "Unknown",
      productImage: r.product.product?.imageUrl || null,
      productUnit: r.product.product?.unit || "pcs",
      restaurant: r.restaurant,
      quantity: r.quantity,
      message: r.message,
      status: r.status,
      unlockedPrice: r.unlockedPrice,
      ownerCounterPrice: r.ownerCounterPrice,
      validUntil: r.validUntil,
      adminNote: r.adminNote,
      isExpired: r.status === "UNLOCKED" && r.validUntil ? r.validUntil < new Date() : false,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Get price requests error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
