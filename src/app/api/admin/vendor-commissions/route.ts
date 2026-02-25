import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/vendor-commissions
 * Returns commission summary per vendor, or detailed records for a specific vendor.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId");
    const status = searchParams.get("status");

    // If vendorId provided: return detailed commission records for that vendor
    if (vendorId) {
      const commissions = await db.vendorCommission.findMany({
        where: { vendorId },
        include: {
          order: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              createdAt: true,
              restaurant: {
                select: { id: true, name: true },
              },
              owner: {
                select: { id: true, name: true },
              },
            },
          },
          collection: {
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const vendor = await db.user.findUnique({
        where: { id: vendorId },
        select: {
          id: true,
          name: true,
          email: true,
          vendorProfile: {
            select: {
              commissionRate: true,
              revenueModel: true,
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
          vendor,
          commissions,
        },
      });
    }

    // No vendorId: return all vendors with COMMISSION revenue model and their summary
    const vendors = await db.user.findMany({
      where: {
        vendorProfile: {
          revenueModel: "COMMISSION",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        vendorProfile: {
          select: {
            commissionRate: true,
          },
        },
      },
    });

    const vendorSummaries = await Promise.all(
      vendors.map(async (vendor) => {
        const [totalResult, pendingResult] = await Promise.all([
          db.vendorCommission.aggregate({
            where: { vendorId: vendor.id },
            _sum: { commissionAmount: true },
          }),
          db.vendorCommission.aggregate({
            where: {
              vendorId: vendor.id,
              collectionId: null,
            },
            _sum: { commissionAmount: true },
          }),
        ]);

        const collectionsWhere: Record<string, unknown> = {
          vendorId: vendor.id,
        };
        if (status) {
          collectionsWhere.status = status;
        }

        const collections = await db.vendorCommissionCollection.findMany({
          where: collectionsWhere,
          orderBy: { createdAt: "desc" },
        });

        return {
          vendor: {
            id: vendor.id,
            name: vendor.name,
            email: vendor.email,
          },
          commissionRate: vendor.vendorProfile?.commissionRate ?? null,
          totalCommission: totalResult._sum.commissionAmount ?? 0,
          pendingCommission: pendingResult._sum.commissionAmount ?? 0,
          collections,
        };
      })
    );

    return NextResponse.json({ ok: true, data: vendorSummaries });
  } catch (error) {
    console.error("Get vendor commissions error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
