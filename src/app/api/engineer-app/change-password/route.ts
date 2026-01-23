import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";
import bcrypt from "bcrypt";

/**
 * POST /api/engineer-app/change-password
 * Change engineer password
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);
    const body = await request.json();

    const { current_password, new_password, new_password_confirmation } = body;

    // Validate required fields
    if (!current_password || !new_password || !new_password_confirmation) {
      return NextResponse.json(
        {
          ok: false,
          error: "All password fields are required",
          errors: {
            current_password: !current_password ? ["Current password is required"] : undefined,
            new_password: !new_password ? ["New password is required"] : undefined,
            new_password_confirmation: !new_password_confirmation ? ["Password confirmation is required"] : undefined,
          },
        },
        { status: 422 }
      );
    }

    // Validate password confirmation
    if (new_password !== new_password_confirmation) {
      return NextResponse.json(
        {
          ok: false,
          error: "Passwords do not match",
          errors: {
            new_password_confirmation: ["Passwords do not match"],
          },
        },
        { status: 422 }
      );
    }

    // Validate password length
    if (new_password.length < 6) {
      return NextResponse.json(
        {
          ok: false,
          error: "New password must be at least 6 characters",
          errors: {
            new_password: ["Password must be at least 6 characters"],
          },
        },
        { status: 422 }
      );
    }

    // Get user with password hash
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has a password (might be OAuth user)
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          ok: false,
          error: "Cannot change password for accounts created with social login",
        },
        { status: 400 }
      );
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "Current password is incorrect",
          errors: {
            current_password: ["Current password is incorrect"],
          },
        },
        { status: 422 }
      );
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await db.user.update({
      where: { id: session.id },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
