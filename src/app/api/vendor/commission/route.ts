import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";

/**
 * GET /api/vendor/commission
 * Vendor views their commission data: profile info, commissions, summaries, collections
 */
export async function GET() {
  try {
    const session = await requireVendor();

    const vendorProfile = await db.vendorProfile.findUnique({
      where: { userId: session.id },
      select: {
        revenueModel: true,
        commissionRate: true,
      },
    });

    const [commissions, collections] = await Promise.all([
      db.vendorCommission.findMany({
        where: { vendorId: session.id },
        include: {
          order: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.vendorCommissionCollection.findMany({
        where: { vendorId: session.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Calculate commission summaries
    const totalCommission = commissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0
    );

    const pendingCommission = commissions
      .filter((c) => c.collectionId === null)
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    // For paid commission, we need collections with VERIFIED status
    const verifiedCollectionIds = new Set(
      collections
        .filter((col) => col.status === "VERIFIED")
        .map((col) => col.id)
    );

    const paidCommission = commissions
      .filter(
        (c) => c.collectionId !== null && verifiedCollectionIds.has(c.collectionId)
      )
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    return NextResponse.json({
      ok: true,
      data: {
        vendorProfile,
        commissions,
        totalCommission,
        pendingCommission,
        paidCommission,
        collections,
      },
    });
  } catch (error) {
    console.error("Get vendor commission error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      {
        status:
          error instanceof Error && error.message.includes("Unauthorized")
            ? 401
            : 500,
      }
    );
  }
}
