import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { getOrCreateSystemVendor } from "@/server/my-store";

// GET /api/admin/my-store/products/available - List products not yet in admin's store
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    await getOrCreateSystemVendor(session.id);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const subCategoryId = searchParams.get("subCategoryId");

    // Get IDs of products admin already has in store
    const vendorProductIds = await db.vendorProduct.findMany({
      where: {
        vendorId: session.id,
        deletedAt: null,
        productId: { not: null },
      },
      select: { productId: true },
    });

    const existingProductIds = vendorProductIds
      .map((vp) => vp.productId)
      .filter((id): id is string => id !== null);

    // Admin has access to ALL categories — no category selection check needed
    const where: any = {
      isActive: true,
      deletedAt: null,
      ...(categoryId ? { marketplaceCategoryId: categoryId } : {}),
      ...(subCategoryId ? { marketplaceSubCategoryId: subCategoryId } : {}),
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
      include: {
        marketplaceCategory: {
          select: { id: true, name: true },
        },
        marketplaceSubCategory: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { marketplaceCategory: { name: "asc" } },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      ok: true,
      data: availableProducts,
    });
  } catch (error) {
    console.error("Get available products for admin store error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
