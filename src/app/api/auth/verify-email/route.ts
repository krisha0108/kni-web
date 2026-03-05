import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifyEmailCode } from "@/server/email-code/service";
import { createSession } from "@/server/auth/session";
import { getRoleDashboardUrl } from "@/server/auth/rbac";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, code } = validation.data;

    // Verify the code
    const result = await verifyEmailCode({
      email,
      code,
      purpose: "EMAIL_VERIFICATION",
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    // Mark user as email verified
    const user = await db.user.update({
      where: { email },
      data: { emailVerified: true },
      include: {
        restaurants: {
          where: { status: "APPROVED" },
          take: 1,
        },
        restaurantMemberships: {
          where: {
            acceptedAt: { not: null },
            restaurant: { status: "APPROVED" },
          },
          take: 1,
        },
      },
    });

    // Create session (user gets logged in after verification)
    const token = await createSession(user.id);

    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      hasApprovedRestaurant: user.restaurants.length > 0 || user.restaurantMemberships.length > 0,
    };

    const redirectUrl = getRoleDashboardUrl(user.role, sessionData);

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
        restaurants: user.restaurants,
        hasApprovedRestaurant: user.restaurants.length > 0 || user.restaurantMemberships.length > 0,
        redirectUrl,
      },
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
