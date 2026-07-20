import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { loginSchema } from "@/server/validators/auth";
import { createSession } from "@/server/auth/session";
import { generateAndSendEmailCode } from "@/server/email-code/service";
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

    // Find user with restaurant data (owned + team member)
    const user = await db.user.findUnique({
      where: { email },
      include: {
        ownerProfile: true,
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
        restaurantMemberships: {
          where: {
            acceptedAt: { not: null },
            restaurant: { status: "APPROVED" },
          },
          include: {
            restaurant: {
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
        },
        _count: {
          select: { restaurants: true },
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

    // Block login for unverified email
    if (!user.emailVerified) {
      await generateAndSendEmailCode({
        email,
        purpose: "EMAIL_VERIFICATION",
        userName: user.name,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Email not verified. A new verification code has been sent to your email.",
          code: "EMAIL_NOT_VERIFIED",
          email: user.email,
        },
        { status: 403 }
      );
    }

    // Block login for owners whose registration is not approved yet
    if (user.ownerProfile) {
      if (user.ownerProfile.approvalStatus === "PENDING") {
        return NextResponse.json(
          {
            ok: false,
            error: "Your registration is pending admin approval. You'll be notified once it's reviewed.",
            code: "OWNER_PENDING_APPROVAL",
          },
          { status: 403 }
        );
      }
      if (user.ownerProfile.approvalStatus === "REJECTED") {
        return NextResponse.json(
          {
            ok: false,
            error: "Your registration was rejected. Please contact support for more information.",
            code: "OWNER_REJECTED",
          },
          { status: 403 }
        );
      }
    }

    // Create session and get token for mobile
    const token = await createSession(user.id);

    // Combine owned + team member restaurants
    const teamRestaurants = user.restaurantMemberships.map((m) => m.restaurant);
    const allRestaurants = [...user.restaurants, ...teamRestaurants];

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
        restaurants: allRestaurants,
        hasApprovedRestaurant: allRestaurants.length > 0,
        hasAnyRestaurant: user._count.restaurants > 0 || user.restaurantMemberships.length > 0,
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
