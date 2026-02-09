import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { VendorApprovalStatus, VendorSubscriptionStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const where = status
      ? { vendorProfile: { approvalStatus: status as any } }
      : {};

    const vendors = await db.user.findMany({
      where: {
        role: "VENDOR",
        isActive: true,
        ...where,
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
    const { vendorId, action, rejectionReason } = body;

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
      await db.vendorProfile.update({
        where: { userId: vendorId },
        data: {
          approvalStatus: VendorApprovalStatus.APPROVED,
          subscriptionStatus: VendorSubscriptionStatus.TRIAL,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          approvalNote: null,
          rejectionReason: null,
        },
      });

      await db.notification.create({
        data: {
          userId: vendorId,
          title: "Account Approved!",
          message: "Congratulations! Your vendor account has been approved. You now have a 14-day free trial.",
          linkUrl: "/vendor/dashboard",
        },
      });

      return NextResponse.json({ ok: true, message: "Vendor approved successfully" });
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

      return NextResponse.json({ ok: true, message: "Vendor rejected successfully" });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action. Use 'approve' or 'reject'" },
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
