import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";
import { createNotificationForRole } from "@/server/notifications/service";
import { Role, NotificationType } from "@prisma/client";

// POST /api/vendor/request-review - Request re-review for rejected vendor
export async function POST(request: NextRequest) {
  try {
    const session = await requireVendor();

    // Get vendor profile
    const vendorProfile = await db.vendorProfile.findUnique({
      where: { userId: session.id },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!vendorProfile) {
      return NextResponse.json(
        { ok: false, error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    // Only rejected vendors can request review
    if (vendorProfile.approvalStatus !== "REJECTED") {
      return NextResponse.json(
        { ok: false, error: "Only rejected applications can request review" },
        { status: 400 }
      );
    }

    // Update status to PENDING
    await db.vendorProfile.update({
      where: { userId: session.id },
      data: {
        approvalStatus: "PENDING",
        approvalNote: `Re-review requested on ${new Date().toLocaleDateString()}. Previous rejection reason: ${vendorProfile.rejectionReason || vendorProfile.approvalNote || "Not specified"}`,
        rejectionReason: null,
      },
    });

    // Notify admins
    await createNotificationForRole(
      Role.ADMIN,
      "Vendor Review Request",
      `${vendorProfile.user.name} has requested a re-review of their vendor application.`,
      NotificationType.SYSTEM,
      "/admin/vendors?status=PENDING"
    );

    return NextResponse.json({
      ok: true,
      message: "Review request submitted successfully",
    });
  } catch (error) {
    console.error("Request review error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
