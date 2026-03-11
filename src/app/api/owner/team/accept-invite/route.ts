import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { acceptInviteSchema } from "@/server/validators/team";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = acceptInviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, tempPassword, newPassword } = validation.data;

    // Find membership by invite token
    const membership = await db.restaurantMember.findUnique({
      where: { inviteToken: token },
      include: {
        user: true,
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (membership.inviteExpiresAt && membership.inviteExpiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if already accepted
    if (membership.acceptedAt) {
      return NextResponse.json(
        { ok: false, error: "Invitation already accepted. Please login with your password." },
        { status: 400 }
      );
    }

    // Verify temp password before allowing password change
    const isTempPasswordValid = await bcrypt.compare(
      tempPassword,
      membership.user.passwordHash
    );

    if (!isTempPasswordValid) {
      return NextResponse.json(
        { ok: false, error: "Temporary password is incorrect" },
        { status: 401 }
      );
    }

    // Set new password and mark email as verified
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: membership.userId },
      data: {
        passwordHash: newPasswordHash,
        emailVerified: true,
      },
    });

    // Accept invitation and clear token
    const updatedMembership = await db.restaurantMember.update({
      where: { id: membership.id },
      data: {
        acceptedAt: new Date(),
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        membership: updatedMembership,
        restaurant: membership.restaurant,
      },
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
