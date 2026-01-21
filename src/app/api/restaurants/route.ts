import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

/**
 * GET /api/restaurants
 * Fetch restaurants for current owner
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const restaurants = await db.restaurant.findMany({
      where: {
        ownerId: session.id,
      },
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
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      ok: true,
      data: restaurants,
      total: restaurants.length,
    });
  } catch (error: any) {
    console.error("Get restaurants error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/restaurants
 * Create new restaurant
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Handle multipart form data
    const formData = await request.formData();
    const name = (formData.get("name") || formData.get("hotel_name"))?.toString() || "";
    const address = formData.get("address")?.toString() || "";
    const city = formData.get("city")?.toString() || "";
    const pincode = formData.get("pincode")?.toString() || "";
    const fssaiNumber = formData.get("fssai_number")?.toString() || "";

    if (!name || !address) {
      return NextResponse.json(
        { ok: false, error: "Name and address are required" },
        { status: 400 }
      );
    }

    const restaurant = await db.restaurant.create({
      data: {
        ownerId: session.id,
        name,
        address,
        city: city || "",
        pincode: pincode || "",
        fssaiNumber: fssaiNumber || "",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      data: restaurant,
      message: "Restaurant created successfully",
    });
  } catch (error: any) {
    console.error("Create restaurant error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
