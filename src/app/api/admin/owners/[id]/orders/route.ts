import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

// GET - All marketplace orders for one owner (Admin Owner 360° view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const orders = await db.marketplaceOrder.findMany({
      where: { ownerId: id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        expectedDeliveryDate: true,
        actualDeliveryDate: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            qty: true,
            priceSnapshot: true,
            product: {
              select: {
                id: true,
                name: true, // legacy fallback name
                product: { select: { name: true } }, // canonical MarketplaceProduct name, when linked
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: orders });
  } catch (error) {
    console.error("Get owner orders error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
