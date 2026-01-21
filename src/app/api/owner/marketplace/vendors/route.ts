import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getRestaurantAccess } from "@/server/auth/restaurant-rbac";

/**
 * GET /api/owner/marketplace/vendors
 * List all approved and active vendors that can serve the owner's restaurant
 * Filters based on vendor coverage (city-wide or pincode-wise)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const search = searchParams.get("search") || "";

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

    // Get restaurant to check coverage matching
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

    // Fetch all approved and active vendors
    const vendors = await db.user.findMany({
      where: {
        role: "VENDOR",
        isActive: true,
        ...(search ? { name: { contains: search } } : {}),
        vendorProfile: {
          approvalStatus: "APPROVED",
          OR: [
            { subscriptionStatus: "TRIAL", trialEndsAt: { gt: now } },
            { subscriptionStatus: "ACTIVE", activeUntil: { gt: now } },
          ],
        },
      },
      include: {
        vendorProfile: {
          select: {
            approvalStatus: true,
            subscriptionStatus: true,
            trialEndsAt: true,
            activeUntil: true,
          },
        },
        vendorCoverage: true,
        vendorStats: {
          select: {
            averageRating: true,
            totalRatings: true,
          },
        },
        _count: {
          select: {
            vendorProducts: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Filter vendors based on coverage
    const filteredVendors = vendors.filter((vendor) => {
      const coverage = vendor.vendorCoverage;

      // No coverage set = NOT visible (vendor must configure coverage)
      if (!coverage) return false;

      // CITY_WIDE: check if restaurant city is in vendor's cities
      if (coverage.coverageType === "CITY_WIDE") {
        const cities = (coverage.cities as string[]) || [];
        // Must have at least one city configured
        if (cities.length === 0) return false;
        return cities.some(
          (city) => city.toLowerCase() === restaurant.city.toLowerCase()
        );
      }

      // PINCODE_WISE: check if restaurant pincode is in vendor's pincodes
      if (coverage.coverageType === "PINCODE_WISE") {
        if (!restaurant.pincode) return false; // Restaurant must have pincode
        const pincodes = (coverage.pincodes as string[]) || [];
        // Must have at least one pincode configured
        if (pincodes.length === 0) return false;
        return pincodes.includes(restaurant.pincode);
      }

      return false;
    });

    // Format response for mobile app
    const formattedVendors = filteredVendors.map((vendor) => {
      return {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        approvalStatus: vendor.vendorProfile?.approvalStatus,
        subscriptionStatus: vendor.vendorProfile?.subscriptionStatus,
        coverage: {
          type: vendor.vendorCoverage?.coverageType,
          cities: vendor.vendorCoverage?.cities,
          pincodes: vendor.vendorCoverage?.pincodes,
        },
        stats: {
          avgRating: vendor.vendorStats?.averageRating || 0,
          totalRatings: vendor.vendorStats?.totalRatings || 0,
          activeProducts: vendor._count.vendorProducts,
        },
      };
    });

    return NextResponse.json({
      ok: true,
      data: formattedVendors,
    });
  } catch (error) {
    console.error("Get marketplace vendors error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
