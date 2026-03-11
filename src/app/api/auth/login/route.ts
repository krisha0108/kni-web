import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { loginSchema } from "@/server/validators/auth";
import { createSession } from "@/server/auth/session";
import { getRoleDashboardUrl } from "@/server/auth/rbac";
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

    const user = await db.user.findUnique({
      where: { email },
      include: {
        vendorProfile: true,
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

    // Block login for unverified email (owners who registered themselves)
    // Skip this check for team-invited users (they have pending memberships)
    if (user.role === "OWNER" && !user.emailVerified) {
      const hasPendingInvite = await db.restaurantMember.findFirst({
        where: {
          userId: user.id,
          acceptedAt: null,
        },
      });

      // Only block if user is NOT a team invite (registered themselves)
      if (!hasPendingInvite) {
        // Send a new verification code
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
    }

    // Block login for vendors who are not approved yet
    if (user.role === "VENDOR" && user.vendorProfile) {
      if (user.vendorProfile.approvalStatus === "PENDING") {
        return NextResponse.json(
          {
            ok: false,
            error: "Your vendor account is pending approval. Please wait for admin approval before logging in.",
            code: "VENDOR_PENDING_APPROVAL"
          },
          { status: 403 }
        );
      }
      if (user.vendorProfile.approvalStatus === "REJECTED") {
        return NextResponse.json(
          {
            ok: false,
            error: "Your vendor account has been rejected. Please contact support for more information.",
            code: "VENDOR_REJECTED"
          },
          { status: 403 }
        );
      }
    }

    // Auto-accept any pending team invitations for this user on first login
    // This handles the case where a new user was invited via team management
    // and logs in with their temp password before clicking the invite link
    if (user.role === "OWNER" && user.restaurantMemberships.length === 0) {
      const pendingInvites = await db.restaurantMember.findMany({
        where: {
          userId: user.id,
          acceptedAt: null,
          restaurant: { status: "APPROVED" },
        },
      });

      if (pendingInvites.length > 0) {
        await db.restaurantMember.updateMany({
          where: {
            userId: user.id,
            acceptedAt: null,
            restaurant: { status: "APPROVED" },
          },
          data: {
            acceptedAt: new Date(),
            inviteToken: null,
            inviteExpiresAt: null,
          },
        });

        // Mark email as verified since they logged in with valid credentials
        if (!user.emailVerified) {
          await db.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          });
        }

        // Re-fetch memberships after auto-accept
        user.restaurantMemberships = await db.restaurantMember.findMany({
          where: {
            userId: user.id,
            acceptedAt: { not: null },
            restaurant: { status: "APPROVED" },
          },
          take: 1,
        });
      }
    }

    // Create session and get the token
    const sessionToken = await createSession(user.id);

    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      vendorApprovalStatus: user.vendorProfile?.approvalStatus ?? null,
      vendorSubscriptionStatus: user.vendorProfile?.subscriptionStatus ?? null,
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
        token: sessionToken, // Return token for mobile apps
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
