import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

/**
 * GET /api/admin/my-store/price-requests
 * Admin lists all incoming price unlock requests
 * Query params: status (PENDING|UNLOCKED|DECLINED), search, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && ["PENDING", "COUNTERED", "UNLOCKED", "DECLINED"].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { owner: { name: { contains: search } } },
        { restaurant: { name: { contains: search } } },
        { product: { product: { name: { contains: search } } } },
      ];
    }

    const [requests, total] = await Promise.all([
      db.priceUnlockRequest.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true } },
          restaurant: { select: { id: true, name: true, city: true } },
          product: {
            include: {
              product: {
                select: { name: true, imageUrl: true, unit: true },
              },
            },
          },
        },
        orderBy: [
          { status: "asc" }, // PENDING first
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      db.priceUnlockRequest.count({ where }),
    ]);

    const data = requests.map((r) => ({
      id: r.id,
      owner: r.owner,
      restaurant: r.restaurant,
      productName: r.product.product?.name || "Unknown",
      productImage: r.product.product?.imageUrl || null,
      productUnit: r.product.product?.unit || "pcs",
      vendorProductId: r.vendorProductId,
      currentPrice: r.product.price,
      quantity: r.quantity,
      message: r.message,
      status: r.status,
      unlockedPrice: r.unlockedPrice,
      ownerCounterPrice: r.ownerCounterPrice,
      validUntil: r.validUntil,
      adminNote: r.adminNote,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    // Get pending count for badge (PENDING = new request, COUNTERED = owner
    // countered and is waiting on admin again - both need admin action)
    const pendingCount = await db.priceUnlockRequest.count({
      where: { status: { in: ["PENDING", "COUNTERED"] } },
    });

    return NextResponse.json({
      ok: true,
      data: { items: data, total, page, pageSize: limit },
      pendingCount,
    });
  } catch (error) {
    console.error("Get admin price requests error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
