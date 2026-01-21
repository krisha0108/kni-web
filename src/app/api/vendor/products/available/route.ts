import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireApprovedVendor } from "@/server/auth/rbac";

// GET /api/vendor/products/available - Get admin products that vendor hasn't added pricing to
export async function GET(request: NextRequest) {
  try {
    const session = await requireApprovedVendor();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";

    // Get IDs of products vendor already has
    const vendorProductIds = await db.vendorProduct.findMany({
      where: {
        vendorId: session.id,
        deletedAt: null,
        productId: { not: null },
      },
      select: { productId: true },
    });

    // Filter out null productIds
    const existingProductIds = vendorProductIds
      .map((vp) => vp.productId)
      .filter((id): id is string => id !== null);

    // Get admin products that vendor hasn't added yet
    const where: any = {
      isActive: true,
      deletedAt: null,
      NOT: {
        id: { in: existingProductIds },
      },
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      } : {}),
    };

    const availableProducts = await db.marketplaceProduct.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      ok: true,
      data: availableProducts,
    });
  } catch (error) {
    console.error("Get available products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
