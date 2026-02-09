import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { VendorApprovalStatus, VendorSubscriptionStatus, VendorLocationRequestStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const vendor = await db.user.findUnique({
      where: { id, role: "VENDOR" },
      include: {
        vendorProfile: true,
        vendorCategories: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { ok: false, error: "Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...vendor,
        categories: vendor.vendorCategories.map((vc) => vc.category),
      },
    });
  } catch (error) {
    console.error("Get vendor error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { action, rejectionReason } = body;

    // Check if vendor exists
    const vendor = await db.user.findUnique({
      where: { id, role: "VENDOR" },
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
      // Approve vendor and set trial subscription
      await db.vendorProfile.update({
        where: { userId: id },
        data: {
          approvalStatus: VendorApprovalStatus.APPROVED,
          subscriptionStatus: VendorSubscriptionStatus.TRIAL,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
          approvalNote: null,
          rejectionReason: null,
        },
      });

      // Auto-approve all pending location requests for this vendor
      await db.vendorLocationRequest.updateMany({
        where: {
          vendorId: id,
          status: VendorLocationRequestStatus.PENDING,
        },
        data: {
          status: VendorLocationRequestStatus.APPROVED,
        },
      });

      // Create notification for vendor
      await db.notification.create({
        data: {
          userId: id,
          title: "Account Approved!",
          message: "Congratulations! Your vendor account has been approved. You now have a 14-day free trial.",
          linkUrl: "/vendor/dashboard",
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Vendor approved successfully",
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
        where: { userId: id },
        data: {
          approvalStatus: VendorApprovalStatus.REJECTED,
          approvalNote: rejectionReason.trim(),
          rejectionReason: rejectionReason.trim(),
        },
      });

      // Create notification for vendor
      await db.notification.create({
        data: {
          userId: id,
          title: "Account Application Rejected",
          message: "Your vendor application was rejected. Reason: " + rejectionReason.trim(),
          linkUrl: "/vendor/pending",
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Vendor rejected successfully",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action" },
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
