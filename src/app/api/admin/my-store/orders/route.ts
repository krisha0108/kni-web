import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { MarketplaceOrderStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {
      vendorId: session.id,
      ...(status ? { status: status as MarketplaceOrderStatus } : {}),
    };

    const [orders, total] = await Promise.all([
      db.marketplaceOrder.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          restaurant: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  product: { select: { name: true, unit: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.marketplaceOrder.count({ where }),
    ]);

    // Resolve product names from MarketplaceProduct (VendorProduct.name is legacy/null)
    const resolved = orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: {
          id: item.product.id,
          name: item.product.product?.name || item.product.name || "Unknown Product",
          unit: item.product.product?.unit || item.product.unit || "pcs",
        },
      })),
    }));

    return NextResponse.json({
      ok: true,
      data: { items: resolved, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get admin store orders error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
