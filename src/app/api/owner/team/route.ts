import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { inviteMemberSchema } from "@/server/validators/team";
import { RestaurantRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

    // Check if user already exists
    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // Create new user account with temporary password
      const tempPassword = crypto.randomBytes(12).toString("hex");
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

      // TODO: Send invitation email with temporary password
      console.log(`User created with temp password: ${tempPassword}`);
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
        // For MVP: auto-accept for existing users
        acceptedAt: user.passwordHash ? new Date() : null,
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

    // TODO: Send invitation email
    console.log(`Invitation created with token: ${inviteToken}`);

    return NextResponse.json({ ok: true, data: member });
  } catch (error) {
    console.error("Invite team member error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
