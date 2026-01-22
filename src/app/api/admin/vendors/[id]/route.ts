import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { notifyVendorApproved, notifyVendorRejected, createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";
import { z } from "zod";
import { rejectionReasonSchema } from "@/lib/validations/rejection";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "activate", "block", "expire"]),
  reason: z.string().optional(), // Deprecated: use rejectionReason instead
  rejectionReason: z.string().optional(),
  trialDays: z.number().optional(),
  activeUntil: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = actionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { action, reason, rejectionReason, trialDays, activeUntil } = validation.data;

    const user = await db.user.findUnique({
      where: { id },
      include: { vendorProfile: true },
    });

    if (!user || !user.vendorProfile) {
      return NextResponse.json(
        { ok: false, error: "Vendor not found" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      // Prevent re-approval
      if (user.vendorProfile.approvalStatus === "APPROVED") {
        return NextResponse.json(
          { ok: false, error: "Vendor is already approved" },
          { status: 400 }
        );
      }

      const days = trialDays || 14;
      await db.vendorProfile.update({
        where: { userId: id },
        data: {
          approvalStatus: "APPROVED",
          subscriptionStatus: "TRIAL",
          trialEndsAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          rejectionReason: null, // Clear rejection reason on approval
          approvalNote: null, // Clear approval note as well
        },
      });
      await notifyVendorApproved(id);
    } else if (action === "reject") {
      // Prevent re-rejection
      if (user.vendorProfile.approvalStatus === "REJECTED") {
        return NextResponse.json(
          { ok: false, error: "Vendor is already rejected" },
          { status: 400 }
        );
      }

      // Support both old 'reason' and new 'rejectionReason' fields
      const rejectionReasonValue = rejectionReason || reason;

      if (!rejectionReasonValue) {
        return NextResponse.json(
          { ok: false, error: "Rejection reason is required" },
          { status: 400 }
        );
      }

      // Validate rejection reason
      const reasonValidation = rejectionReasonSchema.safeParse(rejectionReasonValue);
      if (!reasonValidation.success) {
        return NextResponse.json(
          { ok: false, error: reasonValidation.error.issues[0]?.message || "Invalid rejection reason" },
          { status: 400 }
        );
      }

      await db.vendorProfile.update({
        where: { userId: id },
        data: {
          approvalStatus: "REJECTED",
          rejectionReason: reasonValidation.data,
          approvalNote: reasonValidation.data, // Keep for backward compatibility
        },
      });
      await notifyVendorRejected(id, reasonValidation.data);
    } else if (action === "activate") {
      if (!activeUntil) {
        return NextResponse.json(
          { ok: false, error: "Active until date is required" },
          { status: 400 }
        );
      }
      await db.vendorProfile.update({
        where: { userId: id },
        data: {
          subscriptionStatus: "ACTIVE",
          activeUntil: new Date(activeUntil),
        },
      });
      // Notify vendor their subscription is activated
      await createNotification({
        userId: id,
        title: "Subscription Activated",
        message: `Your vendor subscription has been activated and is valid until ${new Date(activeUntil).toLocaleDateString()}.`,
        type: NotificationType.SYSTEM,
        linkUrl: "/vendor/dashboard",
      });
    } else if (action === "block") {
      await db.vendorProfile.update({
        where: { userId: id },
        data: { subscriptionStatus: "BLOCKED", approvalNote: reason },
      });
      // Notify vendor their account is blocked
      await createNotification({
        userId: id,
        title: "Account Blocked",
        message: reason
          ? `Your vendor account has been blocked. Reason: ${reason}`
          : "Your vendor account has been blocked. Please contact support for more information.",
        type: NotificationType.SYSTEM,
        linkUrl: "/vendor/dashboard",
      });
    } else if (action === "expire") {
      await db.vendorProfile.update({
        where: { userId: id },
        data: { subscriptionStatus: "EXPIRED" },
      });
      // Notify vendor their subscription has expired
      await createNotification({
        userId: id,
        title: "Subscription Expired",
        message: "Your vendor subscription has expired. Please renew to continue listing products.",
        type: NotificationType.SYSTEM,
        linkUrl: "/vendor/dashboard",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Vendor action error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
