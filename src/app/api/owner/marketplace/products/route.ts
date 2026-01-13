import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { getRestaurantAccess } from "@/server/auth/restaurant-rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();

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

    // Get restaurant to check coverage
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

    // Fetch products with vendor coverage included
    const products = await db.vendorProduct.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(search ? { name: { contains: search } } : {}),
        ...(categoryId ? { categoryId } : {}),
        vendor: {
          vendorProfile: {
            approvalStatus: "APPROVED",
            OR: [
              { subscriptionStatus: "TRIAL", trialEndsAt: { gt: now } },
              { subscriptionStatus: "ACTIVE", activeUntil: { gt: now } },
            ],
          },
        },
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            vendorCoverage: true,
          },
        },
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Post-filter based on vendor coverage
    const filteredProducts = products.filter((product) => {
      const coverage = product.vendor.vendorCoverage;

      // No coverage set = available to all
      if (!coverage) return true;

      // CITY_WIDE: check if restaurant city is in vendor's cities
      if (coverage.coverageType === "CITY_WIDE") {
        const cities = coverage.cities as string[] || [];
        return cities.includes(restaurant.city);
      }

      // PINCODE_WISE: check if restaurant pincode is in vendor's pincodes
      if (coverage.coverageType === "PINCODE_WISE") {
        if (!restaurant.pincode) return false; // Restaurant must have pincode
        const pincodes = coverage.pincodes as string[] || [];
        return pincodes.includes(restaurant.pincode);
      }

      return false;
    });

    return NextResponse.json({ ok: true, data: filteredProducts });
  } catch (error) {
    console.error("Get marketplace products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
