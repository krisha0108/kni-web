import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { db } from "@/server/db";

/**
 * DELETE /api/owner/notifications/reset-tokens
 * Delete all device tokens for the current user to force re-registration
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    console.log("🗑️ Deleting all device tokens for user:", session.id);

    // Delete all device tokens for this user
    const deleted = await db.deviceToken.deleteMany({
      where: { userId: session.id },
    });

    console.log(`✅ Deleted ${deleted.count} device token(s)`);

    return NextResponse.json({
      ok: true,
      message: `Deleted ${deleted.count} device token(s). Please restart your app to re-register.`,
      deletedCount: deleted.count,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error resetting tokens:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to reset tokens" },
      { status: 500 }
    );
  }
}
