import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getRestaurantAccess } from "@/server/auth/restaurant-rbac";

/**
 * GET /api/owner/marketplace/vendors
 * List all approved and active vendors that can serve the owner's restaurant
 * Filters based on vendor's admin-approved location requests matching restaurant's city
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

    // Fetch all approved and active vendors + system vendor (admin store)
    const vendors = await db.user.findMany({
      where: {
        isActive: true,
        ...(search ? { name: { contains: search } } : {}),
        OR: [
          // System vendor (admin) — always visible
          {
            role: "ADMIN",
            vendorProfile: { isSystemVendor: true },
          },
          // Regular vendors — existing checks
          {
            role: "VENDOR",
            vendorProfile: {
              approvalStatus: "APPROVED",
              OR: [
                { subscriptionStatus: "TRIAL", trialEndsAt: { gt: now } },
                { subscriptionStatus: "ACTIVE", activeUntil: { gt: now } },
              ],
            },
            // Vendor must have approved location matching restaurant's city
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
      include: {
        vendorProfile: {
          select: {
            approvalStatus: true,
            subscriptionStatus: true,
            trialEndsAt: true,
            activeUntil: true,
            isSystemVendor: true,
          },
        },
        vendorLocationRequests: {
          where: { status: "APPROVED" },
          select: {
            area: {
              select: {
                name: true,
                city: { select: { name: true } },
              },
            },
          },
        },
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

    // Format response for mobile app
    const formattedVendors = vendors.map((vendor) => {
      const isSystemVendor = vendor.vendorProfile?.isSystemVendor === true;

      // Get unique city names from approved locations (empty for system vendor)
      const approvedCities = isSystemVendor
        ? []
        : [
            ...new Set(
              vendor.vendorLocationRequests.map((lr) => lr.area.city.name)
            ),
          ];

      return {
        id: vendor.id,
        name: isSystemVendor ? "KNI Official Store" : vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        approvalStatus: vendor.vendorProfile?.approvalStatus,
        subscriptionStatus: vendor.vendorProfile?.subscriptionStatus,
        isSystemVendor,
        locations: {
          cities: approvedCities,
          areas: isSystemVendor ? [] : vendor.vendorLocationRequests.map((lr) => lr.area.name),
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
