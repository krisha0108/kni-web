import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { VendorApprovalStatus } from "@prisma/client";
import { z } from "zod";

const bulkVendorActionSchema = z.object({
  vendorIds: z.array(z.string()).min(1),
  action: z.enum(["APPROVE", "REJECT", "BLOCK", "ACTIVATE"]),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = bulkVendorActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { vendorIds, action, note } = validation.data;

    let updateData: any = {};
    let profileUpdate: any = {};

    switch (action) {
      case "APPROVE":
        profileUpdate = {
          approvalStatus: VendorApprovalStatus.APPROVED,
          approvalNote: note || "Approved by admin",
          subscriptionStatus: "TRIAL",
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        };
        break;
      case "REJECT":
        profileUpdate = {
          approvalStatus: VendorApprovalStatus.REJECTED,
          approvalNote: note || "Rejected by admin",
        };
        break;
      case "BLOCK":
        profileUpdate = {
          subscriptionStatus: "BLOCKED",
        };
        updateData = { isActive: false };
        break;
      case "ACTIVATE":
        updateData = { isActive: true };
        profileUpdate = {
          subscriptionStatus: "ACTIVE",
        };
        break;
    }

    // Update vendors
    if (Object.keys(updateData).length > 0) {
      await db.user.updateMany({
        where: {
          id: { in: vendorIds },
          role: "VENDOR",
        },
        data: updateData,
      });
    }

    // Update vendor profiles
    if (Object.keys(profileUpdate).length > 0) {
      await db.vendorProfile.updateMany({
        where: {
          userId: { in: vendorIds },
        },
        data: profileUpdate,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully applied ${action} to ${vendorIds.length} vendor(s)`,
      data: {
        affected: vendorIds.length,
      },
    });
  } catch (error: any) {
    console.error("Bulk vendor action error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
