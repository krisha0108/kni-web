import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { loginSchema } from "@/server/validators/auth";
import { createSession } from "@/server/auth/session";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user with restaurant data
    const user = await db.user.findUnique({
      where: { email },
      include: {
        restaurants: {
          where: { status: "APPROVED" },
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            pincode: true,
            restaurantImageUrl: true,
            fssaiNumber: true,
            status: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify this is a restaurant owner
    if (user.role !== "OWNER") {
      return NextResponse.json(
        { ok: false, error: "This login is only for restaurant owners" },
        { status: 403 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create session and get token for mobile
    const token = await createSession(user.id);

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        restaurants: user.restaurants,
        hasApprovedRestaurant: user.restaurants.length > 0,
        token, // Token for mobile apps
      },
    });
  } catch (error) {
    console.error("Restaurant login error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
