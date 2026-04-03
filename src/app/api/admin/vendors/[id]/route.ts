import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { VendorApprovalStatus, VendorSubscriptionStatus, VendorLocationRequestStatus, VendorRevenueModel } from "@prisma/client";
import { z } from "zod";

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
    const { action, rejectionReason, durationMonths } = body;

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
      const revenueModel = body.revenueModel || "SUBSCRIPTION"; // SUBSCRIPTION or COMMISSION
      const commissionRate = body.commissionRate; // e.g. 10 for 10%

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
          where: { userId: id },
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
          where: { userId: id },
          data: {
            approvalStatus: VendorApprovalStatus.APPROVED,
            revenueModel: VendorRevenueModel.SUBSCRIPTION,
            commissionRate: null,
            subscriptionStatus: VendorSubscriptionStatus.TRIAL,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
            approvalNote: null,
            rejectionReason: null,
          },
        });
      }

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
      const notificationMessage = revenueModel === "COMMISSION"
        ? `Congratulations! Your vendor account has been approved with Commission model (${commissionRate}%). No subscription required.`
        : "Congratulations! Your vendor account has been approved. You now have a 14-day free trial.";

      await db.notification.create({
        data: {
          userId: id,
          title: "Account Approved!",
          message: notificationMessage,
          linkUrl: "/vendor/dashboard",
        },
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

    if (action === "activate") {
      const months = typeof durationMonths === "number" && durationMonths > 0 ? durationMonths : 12;
      const activeUntil = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

      await db.vendorProfile.update({
        where: { userId: id },
        data: {
          subscriptionStatus: VendorSubscriptionStatus.ACTIVE,
          activeUntil,
        },
      });

      await db.user.update({
        where: { id },
        data: { isActive: true },
      });

      const durationLabel = months >= 12 ? `${Math.floor(months / 12)} year(s)` : `${months} month(s)`;
      await db.notification.create({
        data: {
          userId: id,
          title: "Subscription Activated!",
          message: `Your vendor subscription has been activated for ${durationLabel}.`,
          linkUrl: "/vendor/dashboard",
        },
      });

      return NextResponse.json({
        ok: true,
        message: `Vendor subscription activated for ${durationLabel}`,
      });
    }

    if (action === "block") {
      await db.vendorProfile.update({
        where: { userId: id },
        data: {
          subscriptionStatus: "BLOCKED",
        },
      });

      await db.user.update({
        where: { id },
        data: { isActive: false },
      });

      await db.notification.create({
        data: {
          userId: id,
          title: "Account Blocked",
          message: "Your vendor account has been blocked. Please contact support for more information.",
          linkUrl: "/vendor/subscription",
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Vendor blocked successfully",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action. Use 'approve', 'reject', 'activate', or 'block'" },
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

const patchBodySchema = z.object({
  revenueModel: z.enum(["SUBSCRIPTION", "COMMISSION"]),
  commissionRate: z.number().min(1).max(100).optional(),
}).refine(
  (data) => data.revenueModel !== "COMMISSION" || (data.commissionRate !== undefined && data.commissionRate >= 1 && data.commissionRate <= 100),
  { message: "commissionRate (1-100) is required when revenueModel is COMMISSION", path: ["commissionRate"] }
);

// DELETE - Permanently delete vendor and all their data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const vendor = await db.user.findFirst({
      where: { id, role: "VENDOR", deletedAt: null },
      select: { id: true, name: true, vendorProfile: { select: { isSystemVendor: true } } },
    });

    if (!vendor) {
      return NextResponse.json({ ok: false, error: "Vendor not found" }, { status: 404 });
    }

    // Prevent deleting KNI Official Store (system vendor)
    if (vendor.vendorProfile?.isSystemVendor) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete the KNI Official Store (system vendor)" },
        { status: 400 }
      );
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({
      ok: true,
      message: `Vendor "${vendor.name}" and all associated data permanently deleted.`,
    });
  } catch (error) {
    console.error("Delete vendor error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to delete vendor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const { revenueModel, commissionRate } = parsed.data;

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

    // Build the update payload
    const updateData: {
      revenueModel: VendorRevenueModel;
      commissionRate: number | null;
      approvalStatus?: VendorApprovalStatus;
    } = {
      revenueModel: revenueModel as VendorRevenueModel,
      commissionRate: revenueModel === "COMMISSION" ? commissionRate! : null,
    };

    // Commission vendors are instantly active if currently pending
    if (
      revenueModel === "COMMISSION" &&
      vendor.vendorProfile.approvalStatus === VendorApprovalStatus.PENDING
    ) {
      updateData.approvalStatus = VendorApprovalStatus.APPROVED;
    }

    await db.vendorProfile.update({
      where: { userId: id },
      data: updateData,
    });

    // Notify the vendor about their revenue model change
    const modelLabel = revenueModel === "COMMISSION"
      ? `Commission-based (${commissionRate}%)`
      : "Subscription-based";

    await db.notification.create({
      data: {
        userId: id,
        title: "Revenue Model Updated",
        message: `Your revenue model has been changed to ${modelLabel} by an administrator.`,
        linkUrl: "/vendor/dashboard",
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Vendor revenue model updated to ${revenueModel}`,
    });
  } catch (error) {
    console.error("Patch vendor revenue model error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
