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
    const vendorProducts = await db.vendorProduct.findMany({
      where: {
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
            // Regular vendors — existing location/subscription checks
            {
              vendorProfile: {
                approvalStatus: "APPROVED",
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
      },
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to customer-facing format with product info from admin
    // Filter out any products where product relation is null
    const productsForCustomer = vendorProducts
      .filter((vp) => vp.product !== null)
      .map((vp) => ({
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
      price: vp.price,
      description: vp.description || vp.product!.description, // Use vendor description if set, else admin's
      stockQuantity: vp.stockQuantity,
      deliveryTime: vp.deliveryTime,
      isActive: vp.isActive,
      // Vendor info
      vendor: {
        id: vp.vendor.id,
        name: vp.vendor.name,
      },
      // Stock status
      inStock: vp.stockQuantity > 0,
      canPurchase: vp.isActive && vp.stockQuantity > 0,
    }));

    return NextResponse.json({ ok: true, data: productsForCustomer });
  } catch (error) {
    console.error("Get marketplace products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
