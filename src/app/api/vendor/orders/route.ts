import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireVendor();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const where: any = {
      vendorId: session.id,
      ...(status ? { status: status as any } : {}),
    };

    const orders = await db.marketplaceOrder.findMany({
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
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get vendor orders error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
