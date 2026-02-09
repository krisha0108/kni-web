import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { z } from "zod";

const createOrderSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  vendorId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      qty: z.number().int().positive(),
    })
  ),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with marketplace:read permission
    await requireRestaurantAccess(session, restaurantId, "marketplace:read");

    const orders = await db.marketplaceOrder.findMany({
      where: { restaurantId },
      include: {
        vendor: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: orders });
  } catch (error) {
    console.error("Get marketplace orders error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, vendorId, items, deliveryAddress, notes } = validation.data;

    // Check restaurant access with marketplace:create permission
    await requireRestaurantAccess(session, restaurantId, "marketplace:create");

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 400 }
      );
    }

    // Verify vendor has approved location matching restaurant's city
    const vendorApprovedLocation = await db.vendorLocationRequest.findFirst({
      where: {
        vendorId,
        status: "APPROVED",
        area: {
          city: {
            name: restaurant.city,
          },
        },
      },
    });

    if (!vendorApprovedLocation) {
      return NextResponse.json(
        { ok: false, error: "Vendor is not approved to serve in your restaurant's city" },
        { status: 400 }
      );
    }

    const products = await db.vendorProduct.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalAmount = 0;

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Product not found: " + item.productId);
      totalAmount += product.price * item.qty;
      return {
        vendorProductId: item.productId,
        qty: item.qty,
        priceSnapshot: product.price,
      };
    });

    // Use transaction to create order and vendor ledger entry atomically
    const order = await db.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.marketplaceOrder.create({
        data: {
          ownerId: session.id,
          vendorId,
          restaurantId,
          status: "PLACED",
          totalAmount,
          deliveryAddress: deliveryAddress || null,
          notes: notes || null,
          items: { create: orderItems },
        },
        include: {
          vendor: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Get vendor details for ledger entry
      const vendor = await tx.user.findUnique({
        where: { id: vendorId },
        select: { name: true, phone: true },
      });

      // Get previous vendor ledger balance
      const previousEntries = await tx.vendorLedger.findMany({
        where: {
          restaurantId,
          ownerId: session.id,
          vendorName: vendor?.name || "Unknown Vendor",
        },
        orderBy: {
          entryDate: "desc",
        },
        take: 1,
      });

      const previousBalance = previousEntries[0]?.balanceAfter || 0;
      const newBalance = previousBalance + totalAmount;

      // AUTO-SYNC: Create vendor ledger entry (PURCHASE increases balance owed to vendor)
      await tx.vendorLedger.create({
        data: {
          ownerId: session.id,
          restaurantId,
          vendorName: vendor?.name || "Unknown Vendor",
          vendorPhone: vendor?.phone || null,
          entryType: "PURCHASE",
          amount: totalAmount,
          description: `Marketplace order - ${newOrder.items.length} items`,
          billNumber: `MKT-${newOrder.id.substring(0, 8)}`,
          billDate: new Date(),
          balanceAfter: newBalance,
          entryDate: new Date(),
          createdBy: session.id,
        },
      });

      // AUTO-SYNC: Create Expense entry
      await tx.expense.create({
        data: {
          ownerId: session.id,
          restaurantId,
          category: "SUPPLIES",
          amount: totalAmount,
          expenseDate: new Date(),
          description: `Marketplace order - ${newOrder.items.length} items from ${vendor?.name}`,
        },
      });

      return newOrder;
    });

    return NextResponse.json({ ok: true, data: order });
  } catch (error) {
    console.error("Create marketplace order error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
