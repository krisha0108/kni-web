import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

// GET — Get related products for a given vendor product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: vendorProductId } = await params;

    // Get the current product to find vendor and category
    const currentProduct = await db.vendorProduct.findUnique({
      where: { id: vendorProductId },
      include: {
        product: { select: { marketplaceCategoryId: true } },
      },
    });

    if (!currentProduct) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    }

    const vendorId = currentProduct.vendorId;
    const categoryId = currentProduct.product?.marketplaceCategoryId || currentProduct.categoryId;

    // Fetch "More from this Vendor" — same vendor, different product, limit 6
    const moreFromVendor = await db.vendorProduct.findMany({
      where: {
        vendorId,
        id: { not: vendorProductId },
        isActive: true,
        deletedAt: null,
        stockQuantity: { gt: 0 },
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, imageUrl: true, unit: true } },
      },
    });

    // Fetch "Similar Products" — same category, different vendor, limit 6
    let similarProducts: typeof moreFromVendor = [];
    if (categoryId) {
      similarProducts = await db.vendorProduct.findMany({
        where: {
          id: { not: vendorProductId },
          vendorId: { not: vendorId },
          isActive: true,
          deletedAt: null,
          stockQuantity: { gt: 0 },
          OR: [
            { product: { marketplaceCategoryId: categoryId } },
            { categoryId: categoryId },
          ],
        },
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          vendor: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, imageUrl: true, unit: true } },
        },
      });
    }

    const formatProduct = (vp: any) => ({
      id: vp.id,
      name: vp.product?.name || vp.name || "Product",
      imageUrl: vp.product?.imageUrl || vp.imageUrl,
      unit: vp.product?.unit || vp.unit || "",
      price: vp.price,
      priceOnRequest: vp.priceOnRequest || false,
      deliveryTime: vp.deliveryTime,
      stockQuantity: vp.stockQuantity,
      vendor: vp.vendor,
      vendorId: vp.vendorId,
    });

    return NextResponse.json({
      ok: true,
      data: {
        moreFromVendor: moreFromVendor.map(formatProduct),
        similarProducts: similarProducts.map(formatProduct),
      },
    });
  } catch (error) {
    console.error("Get related products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
