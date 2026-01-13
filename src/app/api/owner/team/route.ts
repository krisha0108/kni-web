import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { inviteMemberSchema } from "@/server/validators/team";
import { RestaurantRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendTeamInvitationEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check if user has team:read permission
    await requireRestaurantAccess(session, restaurantId, "team:read");

    const members = await db.restaurantMember.findMany({
      where: { restaurantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: members });
  } catch (error) {
    console.error("Get team members error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();
    const body = await request.json();
    const validation = inviteMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, email, name, role, phone } = validation.data;

    // Check if user has team:invite permission (only OWNER)
    await requireRestaurantAccess(session, restaurantId, "team:invite");

    // Get restaurant details for email
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Check if user already exists
    let user = await db.user.findUnique({ where: { email } });
    let isNewUser = false;
    let tempPassword: string | undefined;

    if (!user) {
      // Create new user account with temporary password (will be replaced on acceptance)
      isNewUser = true;
      tempPassword = crypto.randomBytes(12).toString("hex");
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      user = await db.user.create({
        data: {
          email,
          name,
          phone,
          passwordHash,
          role: "OWNER", // Global role remains OWNER
          isActive: true,
        },
      });

      console.log(`New user created: ${email}`);
    }

    // Check if already a member
    const existing = await db.restaurantMember.findUnique({
      where: {
        restaurantId_userId: {
          restaurantId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "User is already a member of this restaurant" },
        { status: 400 }
      );
    }

    // Generate invitation token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create membership
    const member = await db.restaurantMember.create({
      data: {
        restaurantId,
        userId: user.id,
        role: role as RestaurantRole,
        invitedBy: session.id,
        inviteToken,
        inviteExpiresAt,
        // New users need to accept and set password, existing users are auto-accepted
        acceptedAt: isNewUser ? null : new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Send invitation email
    try {
      await sendTeamInvitationEmail(
        email,
        session.name,
        restaurant.name,
        role,
        inviteToken,
        isNewUser,
        tempPassword
      );
      console.log(`Invitation email sent to ${email}`);
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ ok: true, data: member });
  } catch (error) {
    console.error("Invite team member error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
