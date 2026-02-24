import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";
import { isValidImageUrl } from "@/lib/validations/url";

/**
 * POST /api/vendor/subscription/upload
 * Vendor uploads payment screenshot
 * Only allowed when status = PRICE_SENT or PAYMENT_REJECTED
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireVendor();
    const body = await request.json();
    const { screenshotUrl } = body;

    if (!screenshotUrl || !isValidImageUrl(screenshotUrl)) {
      return NextResponse.json(
        { ok: false, error: "A valid screenshot URL is required" },
        { status: 400 }
      );
    }

    // Find the latest non-terminal request for this vendor
    const subRequest = await db.vendorSubscriptionRequest.findFirst({
      where: {
        vendorId: session.id,
        status: { in: ["PRICE_SENT", "PAYMENT_REJECTED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subRequest) {
      return NextResponse.json(
        { ok: false, error: "No subscription request found that accepts payment upload" },
        { status: 404 }
      );
    }

    // Update request with screenshot
    await db.vendorSubscriptionRequest.update({
      where: { id: subRequest.id },
      data: {
        screenshotUrl,
        status: "PAYMENT_UPLOADED",
        paymentUploadedAt: new Date(),
      },
    });

    // Notify admins
    const vendor = await db.user.findUnique({ where: { id: session.id }, select: { name: true } });
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "Subscription Payment Screenshot Uploaded",
        message: `Vendor ${vendor?.name || "Unknown"} uploaded payment screenshot. Please verify.`,
        type: NotificationType.PAYMENT,
        linkUrl: "/admin/vendor-subscriptions",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Upload subscription screenshot error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
