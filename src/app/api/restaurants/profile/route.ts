import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getMobileSession } from "@/server/auth/mobile-session";

/**
 * GET /api/restaurants/profile
 * Fetch restaurant owner profile with restaurants, stats, and reviews
 * Used by mobile app ProfileScreen
 * Supports both cookie-based (web) and token-based (mobile) authentication
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user with restaurants and related data
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        restaurants: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            pincode: true,
            restaurantImageUrl: true,
            fssaiNumber: true,
            fssaiCertificateUrl: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' }
        },
        serviceBookings: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Calculate stats
    const [equipmentCount, amcCount, bookingCount] = await Promise.all([
      db.equipment.count({
        where: {
          ownerId: user.id,
        },
      }),
      db.aMCSubscription.count({
        where: {
          ownerId: user.id,
        },
      }),
      db.serviceBooking.count({
        where: { ownerId: user.id },
      }),
    ]);

    // Calculate average rating from engineer ratings for this owner's bookings
    const ratingsData = await db.engineerRating.findMany({
      where: {
        ownerId: user.id,
      },
      select: {
        overallRating: true
      }
    });

    const averageRating = ratingsData.length > 0
      ? ratingsData.reduce((sum, r) => sum + r.overallRating, 0) / ratingsData.length
      : 0;

    // Fetch recent reviews/ratings given by engineers for this owner's bookings
    const recentReviews = await db.engineerRating.findMany({
      where: {
        ownerId: user.id,
        review: {
          not: null
        }
      },
      select: {
        id: true,
        overallRating: true,
        review: true,
        createdAt: true,
        engineer: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Generate referral code if not exists (simple format for now)
    const referralCode = `KNI-${user.id.slice(0, 8).toUpperCase()}`;

    // Format response
    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      referral_code: referralCode,
      stats: {
        hotels_count: user.restaurants.length,
        requests_count: bookingCount,
        equipment_count: equipmentCount,
        amc_count: amcCount,
      },
      rating: Number(averageRating.toFixed(1)),
      restaurants: user.restaurants.map((r) => ({
        id: r.id,
        hotel_name: r.name,
        address: r.address,
        city: r.city,
        pincode: r.pincode,
        photo: r.restaurantImageUrl,
        rating: 0, // TODO: Calculate restaurant-specific rating
        fssai_number: r.fssaiNumber,
        fssai_certificate_url: r.fssaiCertificateUrl,
        status: r.status,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
      })),
      reviews: recentReviews.map((rv) => ({
        id: rv.id,
        author_name: rv.engineer?.name || 'Engineer',
        text: rv.review || '',
        stars: rv.overallRating,
        created_at: rv.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Get profile error:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
