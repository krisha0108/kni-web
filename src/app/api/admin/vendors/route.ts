import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { VendorApprovalStatus, VendorSubscriptionStatus, VendorRevenueModel, VendorLocationRequestStatus } from "@prisma/client";
import { sendVendorApprovedEmail, sendVendorRejectedEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where = status
      ? { vendorProfile: { approvalStatus: status as VendorApprovalStatus } }
      : {};

    const vendors = await db.user.findMany({
      where: {
        role: "VENDOR",
        ...where,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        vendorProfile: true,
        vendorCategories: {
          include: {
            category: {
              select: { id: true, name: true },
            },
          },
        },
        _count: { select: { vendorProducts: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to include category names
    const vendorsWithCategories = vendors.map((vendor) => ({
      ...vendor,
      categories: vendor.vendorCategories.map((vc) => vc.category),
    }));

    return NextResponse.json({ ok: true, data: vendorsWithCategories });
  } catch (error) {
    console.error("Get vendors error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Approve or Reject vendor
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { vendorId, action, rejectionReason, durationMonths } = body;

    if (!vendorId) {
      return NextResponse.json(
        { ok: false, error: "Vendor ID is required" },
        { status: 400 }
      );
    }

    // Check if vendor exists
    const vendor = await db.user.findUnique({
      where: { id: vendorId, role: "VENDOR" },
      include: { vendorProfile: true },
    });

    if (!vendor) {
      return NextResponse.json(
        { ok: false, error: "Vendor not found" },
        { status: 404 }
      );
    }

    if (!vendor.vendorProfile) {
      return NextResponse.json(
        { ok: false, error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      const revenueModel = body.revenueModel || "SUBSCRIPTION";
      const commissionRate = body.commissionRate;

      // Validate commission rate if commission model
      if (revenueModel === "COMMISSION") {
        if (!commissionRate || commissionRate < 1 || commissionRate > 100) {
          return NextResponse.json(
            { ok: false, error: "Commission rate must be between 1 and 100" },
            { status: 400 }
          );
        }
      }

      if (revenueModel === "COMMISSION") {
        // Commission model: no trial/subscription needed, instantly active
        await db.vendorProfile.update({
          where: { userId: vendorId },
          data: {
            approvalStatus: VendorApprovalStatus.APPROVED,
            revenueModel: VendorRevenueModel.COMMISSION,
            commissionRate,
            subscriptionStatus: null,
            trialEndsAt: null,
            approvalNote: null,
            rejectionReason: null,
          },
        });
      } else {
        // Subscription model: set trial subscription (existing behavior)
        await db.vendorProfile.update({
          where: { userId: vendorId },
          data: {
            approvalStatus: VendorApprovalStatus.APPROVED,
            revenueModel: VendorRevenueModel.SUBSCRIPTION,
            commissionRate: null,
            subscriptionStatus: VendorSubscriptionStatus.TRIAL,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            approvalNote: null,
            rejectionReason: null,
          },
        });
      }

      // Auto-approve all pending location requests for this vendor
      await db.vendorLocationRequest.updateMany({
        where: {
          vendorId,
          status: VendorLocationRequestStatus.PENDING,
        },
        data: {
          status: VendorLocationRequestStatus.APPROVED,
        },
      });

      const notificationMessage = revenueModel === "COMMISSION"
        ? `Congratulations! Your vendor account has been approved with Commission model (${commissionRate}%). No subscription required.`
        : "Congratulations! Your vendor account has been approved. You now have a 14-day free trial.";

      await db.notification.create({
        data: {
          userId: vendorId,
          title: "Account Approved!",
          message: notificationMessage,
          linkUrl: "/vendor/dashboard",
        },
      });

      // Send email (non-blocking)
      sendVendorApprovedEmail(
        vendor.email,
        vendor.name,
        revenueModel,
        revenueModel === "COMMISSION" ? commissionRate : undefined
      ).catch((error) => {
        console.error("Failed to send vendor approved email:", error);
      });

      return NextResponse.json({
        ok: true,
        message: revenueModel === "COMMISSION"
          ? `Vendor approved with Commission model (${commissionRate}%)`
          : "Vendor approved with Subscription model (14-day trial)",
      });
    }

    if (action === "reject") {
      if (!rejectionReason || rejectionReason.trim().length < 10) {
        return NextResponse.json(
          { ok: false, error: "Rejection reason must be at least 10 characters" },
          { status: 400 }
        );
      }

      await db.vendorProfile.update({
        where: { userId: vendorId },
        data: {
          approvalStatus: VendorApprovalStatus.REJECTED,
          approvalNote: rejectionReason.trim(),
          rejectionReason: rejectionReason.trim(),
        },
      });

      await db.notification.create({
        data: {
          userId: vendorId,
          title: "Account Application Rejected",
          message: `Your vendor application was rejected. Reason: ${rejectionReason.trim()}`,
          linkUrl: "/vendor/pending",
        },
      });

      // Send email (non-blocking)
      sendVendorRejectedEmail(
        vendor.email,
        vendor.name,
        rejectionReason.trim()
      ).catch((error) => {
        console.error("Failed to send vendor rejected email:", error);
      });

      return NextResponse.json({ ok: true, message: "Vendor rejected successfully" });
    }

    if (action === "activate") {
      const months = typeof durationMonths === "number" && durationMonths > 0 ? durationMonths : 12;
      const activeUntil = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

      await db.vendorProfile.update({
        where: { userId: vendorId },
        data: {
          subscriptionStatus: VendorSubscriptionStatus.ACTIVE,
          activeUntil,
        },
      });

      await db.user.update({
        where: { id: vendorId },
        data: { isActive: true },
      });

      const durationLabel = months >= 12 ? `${Math.floor(months / 12)} year(s)` : `${months} month(s)`;
      await db.notification.create({
        data: {
          userId: vendorId,
          title: "Subscription Activated!",
          message: `Your vendor subscription has been activated for ${durationLabel}.`,
          linkUrl: "/vendor/dashboard",
        },
      });

      return NextResponse.json({ ok: true, message: `Vendor subscription activated for ${durationLabel}` });
    }

    if (action === "block") {
      await db.vendorProfile.update({
        where: { userId: vendorId },
        data: {
          subscriptionStatus: "BLOCKED",
        },
      });

      await db.user.update({
        where: { id: vendorId },
        data: { isActive: false },
      });

      await db.notification.create({
        data: {
          userId: vendorId,
          title: "Account Blocked",
          message: "Your vendor account has been blocked. Please contact support.",
          linkUrl: "/vendor/subscription",
        },
      });

      return NextResponse.json({ ok: true, message: "Vendor blocked successfully" });
    }

    if (action === "unblock") {
      await db.vendorProfile.update({
        where: { userId: vendorId },
        data: {
          subscriptionStatus: "ACTIVE",
        },
      });

      await db.user.update({
        where: { id: vendorId },
        data: { isActive: true },
      });

      await db.notification.create({
        data: {
          userId: vendorId,
          title: "Account Unblocked",
          message: "Your vendor account has been unblocked. You can now access your dashboard.",
          linkUrl: "/vendor/dashboard",
        },
      });

      return NextResponse.json({ ok: true, message: "Vendor unblocked successfully" });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action. Use 'approve', 'reject', 'activate', 'block', or 'unblock'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Update vendor error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
