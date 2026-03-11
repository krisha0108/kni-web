import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/my-store/price-requests/[id]
 * Admin views single price request detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const priceRequest = await db.priceUnlockRequest.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        restaurant: { select: { id: true, name: true, city: true, address: true } },
        product: {
          include: {
            product: {
              select: { name: true, imageUrl: true, unit: true, description: true },
            },
          },
        },
      },
    });

    if (!priceRequest) {
      return NextResponse.json(
        { ok: false, error: "Price request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...priceRequest,
        productName: priceRequest.product.product?.name || "Unknown",
        productImage: priceRequest.product.product?.imageUrl || null,
        productUnit: priceRequest.product.product?.unit || "pcs",
        currentPrice: priceRequest.product.price,
      },
    });
  } catch (error) {
    console.error("Get price request detail error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
