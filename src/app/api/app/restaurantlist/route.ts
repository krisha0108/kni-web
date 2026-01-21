import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/app/restaurantlist
 * Fetch restaurant list for a specific owner
 * Used by mobile app for selecting restaurant when creating service requests
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const restaurantOwnerId = searchParams.get("restaurant_owner_id");
    const ownerId = searchParams.get("owner_id");

    const userId = restaurantOwnerId || ownerId;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "restaurant_owner_id or owner_id is required" },
        { status: 400 }
      );
    }

    const restaurants = await db.restaurant.findMany({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        pincode: true,
        restaurantImageUrl: true,
        fssaiNumber: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format for mobile app
    const formatted = restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      hotel_name: r.name,
      address: r.address,
      city: r.city,
      pincode: r.pincode,
      image: r.restaurantImageUrl,
      restaurant_image: r.restaurantImageUrl,
      fssai_number: r.fssaiNumber,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Get restaurant list error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to fetch restaurants" },
      { status: 500 }
    );
  }
}
