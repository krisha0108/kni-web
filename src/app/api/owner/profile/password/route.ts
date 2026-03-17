import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

export async function PUT(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const body = await request.json();

    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    try {
      const bcrypt = await import("bcryptjs");

      // Get user with password
      const user = await db.user.findUnique({
        where: { id: session.id },
        select: { id: true, passwordHash: true },
      });

      if (!user || !user.passwordHash) {
        return NextResponse.json(
          { ok: false, error: "User not found" },
          { status: 404 }
        );
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { ok: false, error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.user.update({
        where: { id: session.id },
        data: { passwordHash: hashedPassword },
      });

      return NextResponse.json({
        ok: true,
        message: "Password changed successfully",
      });
    } catch (dbError) {
      console.error("Database error changing password:", dbError);
      return NextResponse.json(
        { ok: false, error: "Failed to change password" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error changing password:", error);
    return NextResponse.json({ ok: false, error: "Failed to change password" }, { status: 500 });
  }
}
