import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { notifyVendorApproved, notifyVendorRejected } from "@/server/notifications/service";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "activate", "block", "expire"]),
  reason: z.string().optional(),
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
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { action, reason, trialDays, activeUntil } = validation.data;

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
      const days = trialDays || 14;
      await db.vendorProfile.update({
        where: { userId: id },
        data: {
          approvalStatus: "APPROVED",
          subscriptionStatus: "TRIAL",
          trialEndsAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        },
      });
      await notifyVendorApproved(id);
    } else if (action === "reject") {
      if (!reason) {
        return NextResponse.json(
          { ok: false, error: "Rejection reason is required" },
          { status: 400 }
        );
      }
      await db.vendorProfile.update({
        where: { userId: id },
        data: {
          approvalStatus: "REJECTED",
          approvalNote: reason,
        },
      });
      await notifyVendorRejected(id, reason);
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
    } else if (action === "block") {
      await db.vendorProfile.update({
        where: { userId: id },
        data: { subscriptionStatus: "BLOCKED", approvalNote: reason },
      });
    } else if (action === "expire") {
      await db.vendorProfile.update({
        where: { userId: id },
        data: { subscriptionStatus: "EXPIRED" },
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
