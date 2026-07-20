import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

// POST — Log a product view
export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const { vendorProductId } = await request.json();

    if (!vendorProductId) {
      return NextResponse.json({ ok: false, error: "vendorProductId required" }, { status: 400 });
    }

    // Upsert — update viewedAt if already exists, create if not
    await db.recentlyViewedProduct.upsert({
      where: {
        userId_vendorProductId: { userId: session.id, vendorProductId },
      },
      update: { viewedAt: new Date() },
      create: { userId: session.id, vendorProductId },
    });

    // Keep only last 20 per user — delete older ones
    const allViewed = await db.recentlyViewedProduct.findMany({
      where: { userId: session.id },
      orderBy: { viewedAt: "desc" },
      skip: 20,
      select: { id: true },
    });
    if (allViewed.length > 0) {
      await db.recentlyViewedProduct.deleteMany({
        where: { id: { in: allViewed.map((v) => v.id) } },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Log recently viewed error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// GET — Get recently viewed products (last 10)
export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const viewed = await db.recentlyViewedProduct.findMany({
      where: { userId: session.id },
      orderBy: { viewedAt: "desc" },
      take: 10,
      include: {
        vendorProduct: {
          include: {
            vendor: { select: { id: true, name: true } },
            product: { select: { id: true, name: true, imageUrl: true, unit: true, marketplaceCategoryId: true } },
          },
        },
      },
    });

    const products = viewed
      .filter((v) => v.vendorProduct.isActive && !v.vendorProduct.deletedAt)
      .map((v) => {
        const vp = v.vendorProduct;
        return {
          id: vp.id,
          name: vp.product?.name || vp.name || "Product",
          imageUrl: vp.product?.imageUrl || vp.imageUrl,
          unit: vp.product?.unit || vp.unit || "",
          price: vp.price,
          deliveryTime: vp.deliveryTime,
          stockQuantity: vp.stockQuantity,
          vendor: vp.vendor,
          vendorId: vp.vendorId,
          categoryId: vp.product?.marketplaceCategoryId || vp.categoryId,
          viewedAt: v.viewedAt,
        };
      });

    return NextResponse.json({ ok: true, data: products });
  } catch (error) {
    console.error("Get recently viewed error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
