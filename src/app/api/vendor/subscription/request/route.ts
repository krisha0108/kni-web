import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * GET /api/vendor/subscription/request
 * Fetch the vendor's latest subscription request
 */
export async function GET() {
  try {
    const session = await requireVendor();

    const latestRequest = await db.vendorSubscriptionRequest.findFirst({
      where: { vendorId: session.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: latestRequest });
  } catch (error) {
    console.error("Get subscription request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendor/subscription/request
 * Create a new subscription request { durationMonths }
 * Only allowed when expired and no active (non-terminal) request exists
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireVendor();
    const body = await request.json();
    const { durationMonths } = body;

    // Validate duration
    const validDurations = [1, 2, 3, 6, 12];
    if (!durationMonths || !validDurations.includes(durationMonths)) {
      return NextResponse.json(
        { ok: false, error: "Invalid duration. Choose 1, 2, 3, 6, or 12 months." },
        { status: 400 }
      );
    }

    // Check vendor profile — must be approved
    const vendorProfile = await db.vendorProfile.findUnique({
      where: { userId: session.id },
    });

    if (!vendorProfile || vendorProfile.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { ok: false, error: "Vendor must be approved to request a subscription" },
        { status: 400 }
      );
    }

    // Check if subscription is still active (not expired)
    const isTrialActive = vendorProfile.subscriptionStatus === "TRIAL" &&
      vendorProfile.trialEndsAt && vendorProfile.trialEndsAt > new Date();
    const isSubActive = vendorProfile.subscriptionStatus === "ACTIVE" &&
      vendorProfile.activeUntil && vendorProfile.activeUntil > new Date();

    if (isTrialActive || isSubActive) {
      return NextResponse.json(
        { ok: false, error: "Your subscription is still active. You can request renewal after it expires." },
        { status: 400 }
      );
    }

    // Check for existing non-terminal request
    const existingRequest = await db.vendorSubscriptionRequest.findFirst({
      where: {
        vendorId: session.id,
        status: { in: ["REQUESTED", "PRICE_SENT", "PAYMENT_UPLOADED", "PAYMENT_REJECTED"] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { ok: false, error: "You already have a pending subscription request. Please wait for it to be processed." },
        { status: 400 }
      );
    }

    // Create the request
    const newRequest = await db.vendorSubscriptionRequest.create({
      data: {
        vendorId: session.id,
        durationMonths,
      },
    });

    // Notify all admins
    const vendor = await db.user.findUnique({ where: { id: session.id }, select: { name: true } });
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "New Subscription Request",
        message: `Vendor ${vendor?.name || "Unknown"} requested a ${durationMonths} month subscription.`,
        type: NotificationType.PAYMENT,
        linkUrl: "/admin/vendor-subscriptions",
      });
    }

    return NextResponse.json({ ok: true, data: newRequest });
  } catch (error) {
    console.error("Create subscription request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
