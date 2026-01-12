import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { loginSchema } from "@/server/validators/auth";
import { createSession } from "@/server/auth/session";
import { getRoleDashboardUrl } from "@/server/auth/rbac";
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

    const user = await db.user.findUnique({
      where: { email },
      include: {
        vendorProfile: true,
        restaurants: {
          where: { status: "APPROVED" },
          take: 1,
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    await createSession(user.id);

    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      vendorApprovalStatus: user.vendorProfile?.approvalStatus ?? null,
      vendorSubscriptionStatus: user.vendorProfile?.subscriptionStatus ?? null,
      hasApprovedRestaurant: user.restaurants.length > 0,
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
        redirectUrl,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
