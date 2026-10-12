import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getRestaurantAccess } from "@/server/auth/restaurant-rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const restaurantId = searchParams.get("restaurantId");
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const sort = searchParams.get("sort") || "";
    // Price sorts must reflect the DISPLAYED price (which can be overridden by a
    // per-owner negotiated/unlocked price for KNI Official Store items), not the
    // raw listed `price` column — so those sorts are applied in JS after the
    // per-owner price transform below, rather than via Prisma's orderBy.
    const sortByDisplayedPrice = sort === "price_asc" || sort === "price_desc";
    const orderBy = sortByDisplayedPrice ? undefined : { createdAt: "desc" as const };

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access
    const access = await getRestaurantAccess(session.id, restaurantId);
    if (!access) {
      return NextResponse.json(
        { ok: false, error: "Access denied to this restaurant" },
        { status: 403 }
      );
    }

    // Get restaurant to check city matching
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { city: true, pincode: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    // Fetch vendor products with product info from MarketplaceProduct
    const vpWhere: any = {
        isActive: true,
        deletedAt: null,
        // Filter by product info from MarketplaceProduct
        product: {
          isActive: true,
          deletedAt: null,
          ...(search ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          } : {}),
          ...(categoryId ? { marketplaceCategoryId: categoryId } : {}),
        },
        // Vendor must be approved, have active subscription, and approved for restaurant's city
        // OR be a system vendor (admin store) — bypasses all checks
        vendor: {
          OR: [
            // System vendor (admin store) — bypass all checks, serves everywhere
            {
              vendorProfile: {
                isSystemVendor: true,
              },
            },
            // Commission vendors — no subscription check, always visible if approved
            {
              vendorProfile: {
                approvalStatus: "APPROVED",
                revenueModel: "COMMISSION",
              },
              vendorLocationRequests: {
                some: {
                  status: "APPROVED",
                  area: {
                    city: {
                      name: restaurant.city,
                    },
                  },
                },
              },
            },
            // Subscription vendors — existing location/subscription checks
            {
              vendorProfile: {
                approvalStatus: "APPROVED",
                revenueModel: "SUBSCRIPTION",
                OR: [
                  { subscriptionStatus: "TRIAL", trialEndsAt: { gt: now } },
                  { subscriptionStatus: "ACTIVE", activeUntil: { gt: now } },
                ],
              },
              vendorLocationRequests: {
                some: {
                  status: "APPROVED",
                  area: {
                    city: {
                      name: restaurant.city,
                    },
                  },
                },
              },
            },
          ],
        },
      };

    const [vendorProducts, vpTotal] = await Promise.all([
      db.vendorProduct.findMany({
      where: vpWhere,
      include: {
        // Include admin product info
        product: {
          include: {
            marketplaceCategory: { select: { id: true, name: true } },
            marketplaceSubCategory: { select: { id: true, name: true } },
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            vendorProfile: {
              select: { isSystemVendor: true },
            },
          },
        },
      },
      ...(orderBy ? { orderBy } : {}),
      // Price sorts need every matching row in hand before they can be sorted
      // by displayed price and paginated in JS (see sortByDisplayedPrice above).
      ...(page > 0 && !sortByDisplayedPrice ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
    }),
      page > 0 && !sortByDisplayedPrice ? db.vendorProduct.count({ where: vpWhere }) : Promise.resolve(-1),
    ]);

    // Batch-fetch active price unlocks/negotiations for this owner. Negotiation
    // is available for any KNI Official Store product, not just ones flagged
    // priceOnRequest (that flag only controls whether the price is hidden
    // until unlocked).
    const systemVendorProductIds = vendorProducts
      .filter((vp) => vp.vendor.vendorProfile?.isSystemVendor)
      .map((vp) => vp.id);

    let unlockMap = new Map<string, { id: string; status: string; unlockedPrice: number | null; ownerCounterPrice: number | null; validUntil: Date | null; quantity: number | null }>();

    if (systemVendorProductIds.length > 0) {
      const unlocks = await db.priceUnlockRequest.findMany({
        where: {
          ownerId: session.id,
          vendorProductId: { in: systemVendorProductIds },
        },
        select: {
          id: true,
          vendorProductId: true,
          status: true,
          unlockedPrice: true,
          ownerCounterPrice: true,
          validUntil: true,
          quantity: true,
        },
      });

      for (const u of unlocks) {
        unlockMap.set(u.vendorProductId, {
          id: u.id,
          status: u.status,
          unlockedPrice: u.unlockedPrice,
          ownerCounterPrice: u.ownerCounterPrice,
          validUntil: u.validUntil,
          quantity: u.quantity,
        });
      }
    }

    // Transform to customer-facing format with product info from admin
    // Filter out any products where product relation is null
    const productsForCustomer = vendorProducts
      .filter((vp) => vp.product !== null)
      .map((vp) => {
      const isAdminStore = vp.vendor.vendorProfile?.isSystemVendor === true;
      const isPriceOnRequest = vp.priceOnRequest && isAdminStore;

      // Determine price visibility based on unlock status
      let price: number | null = vp.price;
      let priceUnlock: { id: string; status: string; unlockedPrice: number | null; ownerCounterPrice: number | null; validUntil: Date | null; isExpired: boolean; quantity: number | null } | null = null;
      let canPurchase = vp.isActive && vp.stockQuantity > 0;

      if (isPriceOnRequest) {
        const unlock = unlockMap.get(vp.id);
        if (unlock) {
          const isExpired = unlock.status === "UNLOCKED" && unlock.validUntil ? unlock.validUntil < now : false;
          priceUnlock = { ...unlock, isExpired };

          if (unlock.status === "UNLOCKED" && !isExpired) {
            // Show unlocked price
            price = unlock.unlockedPrice;
          } else {
            // PENDING, DECLINED, or expired — hide price
            price = null;
            canPurchase = false;
          }
        } else {
          // No request yet — hide price
          price = null;
          canPurchase = false;
        }
      } else if (isAdminStore) {
        // Regular-priced KNI Official Store product — negotiation is optional,
        // never hides the listed price.
        const unlock = unlockMap.get(vp.id);
        if (unlock) {
          const isExpired = unlock.status === "UNLOCKED" && unlock.validUntil ? unlock.validUntil < now : false;
          priceUnlock = { ...unlock, isExpired };
          if (unlock.status === "UNLOCKED" && !isExpired && unlock.unlockedPrice) {
            price = unlock.unlockedPrice;
          }
        }
      }

      return {
        id: vp.id, // Vendor product ID (for ordering)
        vendorId: vp.vendorId,
        productId: vp.productId,
        // Product info from Admin (read-only)
        name: vp.product!.name,
        imageUrl: vp.product!.imageUrl,
        unit: vp.product!.unit,
        category: vp.product!.marketplaceCategory,
        subCategory: vp.product!.marketplaceSubCategory,
        // Vendor-specific info
        price,
        priceOnRequest: isPriceOnRequest,
        priceUnlock,
        description: vp.description || vp.product!.description,
        stockQuantity: vp.stockQuantity,
        deliveryTime: vp.deliveryTime,
        isActive: vp.isActive,
        // Vendor info
        vendor: {
          id: vp.vendor.id,
          name: isAdminStore ? "KNI Official Store" : vp.vendor.name,
        },
        isAdminStore,
        // Stock status
        inStock: vp.stockQuantity > 0,
        canPurchase,
      };
    });

    if (sortByDisplayedPrice) {
      // Items with a hidden price (null — pending/declined/un-negotiated price-on-request)
      // can't be meaningfully placed in a price order, so they always sort last.
      const direction = sort === "price_asc" ? 1 : -1;
      productsForCustomer.sort((a, b) => {
        if (a.price == null && b.price == null) return 0;
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return (a.price - b.price) * direction;
      });
    }

    const total = sortByDisplayedPrice ? productsForCustomer.length : vpTotal;
    const items =
      page > 0 && sortByDisplayedPrice
        ? productsForCustomer.slice((page - 1) * pageSize, page * pageSize)
        : productsForCustomer;

    return NextResponse.json({
      ok: true,
      data: page > 0 ? { items, total, page, pageSize } : items,
    });
  } catch (error) {
    console.error("Get marketplace products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
