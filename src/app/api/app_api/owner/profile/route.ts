import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getMobileSession } from "@/server/auth/mobile-session";

/**
 * GET /api/app_api/owner/profile
 * Fetch owner profile for editing
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

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        restaurants: {
          take: 1,
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Parse name into first and last
    const nameParts = (user.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return NextResponse.json({
      ok: true,
      data: {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        phone: user.phone || "",
        restaurant_name: user.restaurants[0]?.name || "",
        locations: user.restaurants.length,
      },
    });
  } catch (error: any) {
    console.error("Get owner profile error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/app_api/owner/profile
 * Update owner profile
 * Supports both cookie-based (web) and token-based (mobile) authentication
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      restaurant_name,
      locations,
    } = body;

    // Combine first and last name
    const fullName = `${first_name || ""} ${last_name || ""}`.trim();

    // Prepare update data
    const updateData: any = {
      name: fullName || session.name,
      email: email || session.email,
      ...(phone !== undefined ? { phone } : {}),
    };

    // If password provided, hash it
    if (password && password.length > 0) {
      const bcrypt = require("bcrypt");
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: updateData,
    });

    // Update restaurant name if provided
    if (restaurant_name) {
      await db.restaurant.updateMany({
        where: {
          ownerId: session.id,
        },
        data: {
          name: restaurant_name,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: updatedUser.id,
        first_name,
        last_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        restaurant_name,
      },
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("Update owner profile error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
